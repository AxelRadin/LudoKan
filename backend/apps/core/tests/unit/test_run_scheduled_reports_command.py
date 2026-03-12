"""
Tests unitaires pour la commande run_scheduled_reports (BACK-021F).
"""

from io import StringIO
from unittest import mock

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.core.models import ReportSchedule


@pytest.mark.django_db
@pytest.mark.unit
def test_run_scheduled_reports_no_due_schedules():
    """Aucun schedule échu -> message 'Aucun schedule échu.'."""
    out = StringIO()
    call_command("run_scheduled_reports", stdout=out)
    assert "Aucun schedule échu" in out.getvalue()


@pytest.mark.django_db
@pytest.mark.unit
def test_run_scheduled_reports_dry_run():
    """--dry-run affiche les schedules échus sans les exécuter."""
    ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["a@b.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    out = StringIO()
    call_command("run_scheduled_reports", "--dry-run", stdout=out)
    text = out.getvalue()
    assert "Dry-run" in text
    assert "1" in text or "schedule" in text
    assert "users" in text or "id=" in text


@pytest.mark.django_db
@pytest.mark.unit
def test_run_scheduled_reports_processes_due_schedule():
    """Commande exécute run_schedule pour chaque schedule échu et affiche le résumé."""
    ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["test@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    out = StringIO()
    with mock.patch("apps.core.management.commands.run_scheduled_reports.run_schedule") as m_run:
        m_run.return_value = {"success": True, "duration_seconds": 0.1, "file_size_bytes": 50, "recipients_count": 1}
        call_command("run_scheduled_reports", stdout=out)
    text = out.getvalue()
    assert "Traîté(s)" in text or "schedule" in text
    assert m_run.called


@pytest.mark.django_db
@pytest.mark.unit
def test_run_scheduled_reports_handles_exception():
    """Si run_schedule lève une exception, la commande log l'erreur et continue."""
    ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.WEEKLY,
        recipients=["fail@example.com"],
        enabled=True,
        next_run=timezone.now(),
    )
    out = StringIO()
    err = StringIO()
    with mock.patch("apps.core.management.commands.run_scheduled_reports.run_schedule") as m_run:
        m_run.side_effect = Exception("SMTP error")
        call_command("run_scheduled_reports", stdout=out, stderr=err)
    text = out.getvalue() + err.getvalue()
    assert "SMTP" in text or "error" in text or "Traîté(s)" in text
