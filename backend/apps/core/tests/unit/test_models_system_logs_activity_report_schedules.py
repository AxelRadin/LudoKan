"""
Tests unitaires des modèles system_logs, activity_logs et report_schedules (BACK-021A).
Vérifient la création en base et les champs essentiels.
"""

import pytest
from django.utils import timezone

from apps.core.models import ActivityLog, ReportSchedule, SystemLog


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_create_without_user():
    """SystemLog peut être créé sans user (FK optionnel)."""
    log = SystemLog.objects.create(
        event_type="server_start",
        description="Application démarrée",
        metadata={"version": "1.0"},
    )
    assert log.id is not None
    assert log.event_type == "server_start"
    assert log.description == "Application démarrée"
    assert log.user_id is None
    assert log.metadata == {"version": "1.0"}
    assert log.created_at is not None


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_create_with_user(user):
    """SystemLog peut être créé avec un user."""
    log = SystemLog.objects.create(
        event_type="export_done",
        description="Export terminé",
        user=user,
        metadata={"format": "csv"},
    )
    assert log.id is not None
    assert log.user_id == user.id
    assert log.metadata == {"format": "csv"}


@pytest.mark.django_db
@pytest.mark.unit
def test_activity_log_create(user):
    """ActivityLog est créé avec user obligatoire et action."""
    log = ActivityLog.objects.create(
        user=user,
        action=ActivityLog.Action.LOGIN,
        target_type="",
        target_id=None,
        metadata={"ip": "127.0.0.1"},
    )
    assert log.id is not None
    assert log.user_id == user.id
    assert log.action == ActivityLog.Action.LOGIN
    assert log.metadata == {"ip": "127.0.0.1"}
    assert log.created_at is not None


@pytest.mark.django_db
@pytest.mark.unit
def test_activity_log_with_target(user):
    """ActivityLog peut stocker target_type / target_id."""
    log = ActivityLog.objects.create(
        user=user,
        action=ActivityLog.Action.REVIEW_POSTED,
        target_type="review",
        target_id=42,
    )
    assert log.target_type == "review"
    assert log.target_id == 42


@pytest.mark.django_db
@pytest.mark.unit
def test_report_schedule_create():
    """ReportSchedule est créé avec type, fréquence, recipients, enabled."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.USERS,
        frequency=ReportSchedule.Frequency.DAILY,
        recipients=["admin@example.com", "manager@example.com"],
        last_run=None,
        next_run=timezone.now(),
        enabled=True,
    )
    assert schedule.id is not None
    assert schedule.report_type == ReportSchedule.ReportType.USERS
    assert schedule.frequency == ReportSchedule.Frequency.DAILY
    assert schedule.recipients == ["admin@example.com", "manager@example.com"]
    assert schedule.enabled is True
    assert schedule.created_at is not None
    assert schedule.updated_at is not None


@pytest.mark.django_db
@pytest.mark.unit
def test_report_schedule_str():
    """ReportSchedule __str__ affiche type et fréquence."""
    schedule = ReportSchedule.objects.create(
        report_type=ReportSchedule.ReportType.ACTIVITY,
        frequency=ReportSchedule.Frequency.WEEKLY,
        recipients=[],
        enabled=False,
    )
    assert "Activity" in str(schedule)
    assert "weekly" in str(schedule).lower() or "Weekly" in str(schedule)


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_str():
    """SystemLog __str__ contient event_type et created_at."""
    log = SystemLog.objects.create(event_type="backup_ok", description="Backup OK")
    s = str(log)
    assert "backup_ok" in s


@pytest.mark.django_db
@pytest.mark.unit
def test_activity_log_str(user):
    """ActivityLog __str__ contient action et created_at."""
    log = ActivityLog.objects.create(user=user, action=ActivityLog.Action.RATING_ADDED)
    s = str(log)
    assert "rating_added" in s or "Rating" in s
