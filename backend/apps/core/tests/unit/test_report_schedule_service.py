"""
Tests unitaires pour le service de rapports planifiés (BACK-021F).
"""

from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.core.models import ReportSchedule, SystemLog
from apps.core.report_schedule_service import get_next_run, run_schedule


@pytest.mark.unit
def test_get_next_run_daily():
    """get_next_run('daily') ajoute 1 jour."""
    now = timezone.now()
    next_run = get_next_run(ReportSchedule.Frequency.DAILY, now)
    assert (next_run - now).days == 1


@pytest.mark.unit
def test_get_next_run_weekly():
    """get_next_run('weekly') ajoute 7 jours."""
    now = timezone.now()
    next_run = get_next_run(ReportSchedule.Frequency.WEEKLY, now)
    assert (next_run - now).days == 7


@pytest.mark.unit
def test_get_next_run_monthly():
    """get_next_run('monthly') ajoute environ 1 mois."""
    from datetime import datetime

    # 15 jan -> 15 fév
    jan = timezone.make_aware(datetime(2025, 1, 15, 10, 0, 0))
    next_run = get_next_run(ReportSchedule.Frequency.MONTHLY, jan)
    assert next_run.month == 2
    assert next_run.day == 15
    assert next_run.year == 2025


@pytest.mark.unit
def test_get_next_run_monthly_end_of_month():
    """get_next_run('monthly') depuis le 31 jan donne fin février (28 ou 29)."""
    from datetime import datetime

    jan31 = timezone.make_aware(datetime(2025, 1, 31, 12, 0, 0))
    next_run = get_next_run(ReportSchedule.Frequency.MONTHLY, jan31)
    assert next_run.month == 2
    assert next_run.day in (28, 29)
    assert next_run.year == 2025


@pytest.mark.unit
def test_get_next_run_unknown_frequency_defaults_to_one_day():
    """get_next_run avec fréquence inconnue retourne from_time + 1 jour (fallback)."""
    now = timezone.now()
    next_run = get_next_run("invalid_frequency", now)
    assert (next_run - now).days == 1


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_unknown_type_logs_and_returns_error():
    """run_schedule avec un type inconnu crée un system_log et retourne success=False."""
    schedule = ReportSchedule.objects.create(
        report_type="unknown_type",
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["a@b.com"],
        enabled=True,
    )
    out = run_schedule(schedule)
    assert out["success"] is False
    assert "Unknown" in out["error"]
    assert SystemLog.objects.filter(event_type="report_schedule_error").exists()


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_no_recipients_skips_and_updates_next_run():
    """run_schedule sans destinataires valides skip, log et met à jour next_run."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=[],
        enabled=True,
        next_run=timezone.now(),
    )
    out = run_schedule(schedule)
    assert out["success"] is True
    assert out.get("skipped") is True
    schedule.refresh_from_db()
    assert schedule.last_run is not None
    assert schedule.next_run is not None
    assert SystemLog.objects.filter(event_type="report_schedule_skipped").exists()


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_users_sends_email_and_logs(user):
    """run_schedule type users génère rapport, envoie email, log system_logs, met à jour last_run/next_run."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["recipient@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    with patch("apps.core.report_schedule_service.EmailMessage") as mock_email_cls:
        mock_email = mock_email_cls.return_value
        out = run_schedule(schedule)
    assert out["success"] is True
    assert "duration_seconds" in out
    assert out["file_size_bytes"] > 0
    assert out["recipients_count"] == 1
    mock_email.attach.assert_called_once()
    mock_email.send.assert_called_once_with(fail_silently=False)
    schedule.refresh_from_db()
    assert schedule.last_run is not None
    assert schedule.next_run is not None
    assert SystemLog.objects.filter(event_type="report_generated").exists()
    log = SystemLog.objects.get(event_type="report_generated")
    assert log.metadata.get("report_type") == ReportSchedule.ReportType.USERS
    assert "duration_seconds" in log.metadata
    assert "file_size_bytes" in log.metadata


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_email_failure_logs_error():
    """En cas d'échec d'envoi email, un system_log report_schedule_error est créé."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.WEEKLY,
        recipients=["fail@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    with patch("apps.core.report_schedule_service.EmailMessage") as mock_email_cls:
        mock_email_cls.return_value.send.side_effect = Exception("SMTP refused")
        out = run_schedule(schedule)
    assert out["success"] is False
    assert "SMTP" in out["error"]
    assert SystemLog.objects.filter(event_type="report_schedule_error").exists()
    # last_run / next_run ne doivent pas être mis à jour en cas d'erreur
    schedule.refresh_from_db()
    assert schedule.last_run is None


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_activity_type_sends_csv_and_logs():
    """run_schedule type activity génère rapport activité CSV et log (BACK-021F)."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.ACTIVITY,
        frequency=ReportSchedule.Frequency.WEEKLY,
        recipients=["activity@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    with patch("apps.core.report_schedule_service.EmailMessage") as mock_email_cls:
        mock_email = mock_email_cls.return_value
        out = run_schedule(schedule)
    assert out["success"] is True
    assert out["file_size_bytes"] > 0
    mock_email.attach.assert_called_once()
    assert "report_activity.csv" in str(mock_email.attach.call_args[0][0])
    assert SystemLog.objects.filter(event_type="report_generated", metadata__report_type="activity").exists()


@pytest.mark.django_db
@pytest.mark.unit
def test_run_schedule_games_type_sends_csv_and_logs():
    """run_schedule type games appelle _get_games_payload, envoie CSV et log (couverture GAMES)."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.GAMES,
        frequency=ReportSchedule.Frequency.MONTHLY,
        recipients=["games@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    with patch("apps.core.report_schedule_service.EmailMessage") as mock_email_cls:
        mock_email = mock_email_cls.return_value
        out = run_schedule(schedule)
    assert out["success"] is True
    assert out["file_size_bytes"] > 0
    mock_email.attach.assert_called_once()
    assert "report_games.csv" in str(mock_email.attach.call_args[0][0])
    assert SystemLog.objects.filter(event_type="report_generated", metadata__report_type="games").exists()
