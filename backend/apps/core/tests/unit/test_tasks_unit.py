from unittest import mock

import pytest

from apps.core import tasks


def test_send_welcome_email_success(monkeypatch):
    sent_calls = {}

    def fake_guarded(**kwargs):
        sent_calls.update(kwargs)
        return 1

    monkeypatch.setattr(tasks, "send_email_guarded", fake_guarded)

    result = tasks.send_welcome_email("user@example.com", "TestUser")

    assert result == "Email envoyé à user@example.com"
    assert sent_calls["subject"] == "Bienvenue sur LudoKan!"
    assert "Bonjour TestUser" in sent_calls["text_body"]
    assert sent_calls["to"] == ["user@example.com"]
    assert sent_calls["mail_type"] == "welcome"


def test_send_welcome_email_failure(monkeypatch):
    def fake_guarded(**kwargs):
        raise Exception("SMTP Error")

    monkeypatch.setattr(tasks, "send_email_guarded", fake_guarded)

    result = tasks.send_welcome_email("user@example.com", "TestUser")

    assert "Erreur lors de l'envoi" in result


def test_process_game_data_returns_expected_message(monkeypatch):
    sleep_calls = {}

    def fake_sleep(seconds):
        sleep_calls["seconds"] = seconds

    monkeypatch.setattr(tasks.time, "sleep", fake_sleep)

    result = tasks.process_game_data(42)

    assert result == "Données du jeu 42 traitées avec succès"
    assert sleep_calls["seconds"] == 5


def test_cleanup_old_sessions_deletes_expired_sessions(monkeypatch):
    mock_session_manager = mock.Mock()
    mock_queryset = mock.Mock()
    mock_queryset.count.return_value = 3
    mock_session_manager.objects.filter.return_value = mock_queryset

    monkeypatch.setattr("django.contrib.sessions.models.Session", mock_session_manager)

    result = tasks.cleanup_old_sessions()

    mock_session_manager.objects.filter.assert_called_once()
    mock_queryset.delete.assert_called_once()
    assert result == "3 sessions expirées supprimées"


def test_generate_user_statistics_returns_expected_message(monkeypatch):
    sleep_calls = {}

    def fake_sleep(seconds):
        sleep_calls["seconds"] = seconds

    monkeypatch.setattr(tasks.time, "sleep", fake_sleep)

    result = tasks.generate_user_statistics(99)

    assert result == "Statistiques générées pour l'utilisateur 99"
    assert sleep_calls["seconds"] == 3


@pytest.mark.django_db
def test_process_due_report_schedules_returns_empty_when_no_due_schedules():
    """process_due_report_schedules retourne processed=0 quand aucun schedule n'est échu (BACK-021F)."""
    result = tasks.process_due_report_schedules()
    assert result["processed"] == 0
    assert result["results"] == []


@pytest.mark.django_db
def test_process_due_report_schedules_processes_due_schedule():
    """process_due_report_schedules traite chaque schedule échu et appelle run_schedule (BACK-021F)."""
    from django.utils import timezone

    from apps.core.models import ReportSchedule

    now = timezone.now()
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["test@example.com"],
        enabled=True,
        next_run=now,  # échu
    )
    # run_schedule est importé dans la tâche depuis report_schedule_service, il faut patcher là
    with mock.patch("apps.core.report_schedule_service.run_schedule") as mock_run_schedule:
        mock_run_schedule.return_value = {
            "success": True,
            "duration_seconds": 0.1,
            "file_size_bytes": 50,
            "recipients_count": 1,
        }
        result = tasks.process_due_report_schedules()
    assert result["processed"] == 1
    assert len(result["results"]) == 1
    assert result["results"][0]["success"] is True
    assert result["results"][0]["schedule_id"] == schedule.pk
    mock_run_schedule.assert_called_once_with(schedule)


@pytest.mark.django_db
def test_process_due_report_schedules_catches_run_schedule_exception():
    """Si run_schedule lève une exception, la tâche enregistre success=False et error dans results (lignes 32-36)."""
    from django.utils import timezone

    from apps.core.models import ReportSchedule

    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["test@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    with mock.patch("apps.core.report_schedule_service.run_schedule") as mock_run_schedule:
        mock_run_schedule.side_effect = Exception("SMTP failed")
        result = tasks.process_due_report_schedules()
    assert result["processed"] == 1
    assert len(result["results"]) == 1
    assert result["results"][0]["success"] is False
    assert result["results"][0]["schedule_id"] == schedule.pk
    assert "SMTP failed" in result["results"][0]["error"]
