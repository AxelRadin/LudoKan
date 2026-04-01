"""
Couverture des helpers log_activity, log_system_event et log_activity_anomaly (BACK-021A, BACK-022A).
"""

import pytest
from django.contrib.auth.signals import user_login_failed

from apps.core.logging_utils import log_activity, log_email_event, log_system_event
from apps.core.models import ActivityLog, SystemLog


@pytest.mark.django_db
@pytest.mark.unit
def test_log_activity_creates_entry(user):
    """log_activity crée une entrée ActivityLog avec les bons champs."""
    log_activity(user, "login", metadata={"ip": "127.0.0.1"})
    log_activity(user, "review_posted", target_type="review", target_id=10, metadata={"game_id": 5})

    assert ActivityLog.objects.filter(user=user, action="login").count() == 1
    entry = ActivityLog.objects.get(user=user, action="review_posted")
    assert entry.target_type == "review"
    assert entry.target_id == 10
    assert entry.metadata == {"game_id": 5}


@pytest.mark.django_db
@pytest.mark.unit
def test_log_activity_with_none_metadata(user):
    """log_activity avec metadata=None utilise {}."""
    log_activity(user, "logout", metadata=None)
    entry = ActivityLog.objects.get(user=user, action="logout")
    assert entry.metadata == {}


@pytest.mark.django_db
@pytest.mark.unit
def test_log_email_event_merges_extra_metadata():
    """log_email_event avec extra_metadata non vide exécute metadata.update (couverture ligne merge)."""
    log_email_event(
        "email_send_failed",
        mail_type="test",
        recipients=["a@b.com"],
        description="desc",
        extra_metadata={"reason": "send_returned_zero", "detail": "x"},
    )
    entry = SystemLog.objects.get(event_type="email_send_failed")
    assert entry.metadata["mail_type"] == "test"
    assert entry.metadata["reason"] == "send_returned_zero"
    assert entry.metadata["detail"] == "x"
    assert entry.metadata["recipient_count"] == 1


@pytest.mark.django_db
@pytest.mark.unit
def test_log_system_event_without_user():
    """log_system_event sans user crée un SystemLog avec user=None."""
    log_system_event("backup_ok", "Sauvegarde terminée", metadata={"size_mb": 42})
    log_system_event("server_start", "Démarrage", metadata=None)

    assert SystemLog.objects.filter(event_type="backup_ok").count() == 1
    entry = SystemLog.objects.get(event_type="backup_ok")
    assert entry.user_id is None
    assert entry.description == "Sauvegarde terminée"
    assert entry.metadata == {"size_mb": 42}

    entry2 = SystemLog.objects.get(event_type="server_start")
    assert entry2.metadata == {}


@pytest.mark.django_db
@pytest.mark.unit
def test_log_system_event_with_user(user):
    """log_system_event avec user optionnel."""
    log_system_event("export_done", "Export CSV", user=user, metadata={"format": "csv"})
    entry = SystemLog.objects.get(event_type="export_done")
    assert entry.user_id == user.id
    assert entry.metadata == {"format": "csv"}


@pytest.mark.django_db
@pytest.mark.unit
def test_log_activity_anomaly():
    """log_activity_anomaly crée un SystemLog event_type=activity_anomaly (BACK-022A)."""
    from apps.core.logging_utils import log_activity_anomaly

    log_activity_anomaly("Pic de requêtes détecté", metadata={"count": 1000})
    assert SystemLog.objects.filter(event_type="activity_anomaly").exists()
    entry = SystemLog.objects.get(event_type="activity_anomaly")
    assert "Pic" in entry.description
    assert entry.metadata == {"count": 1000}


@pytest.mark.django_db
@pytest.mark.unit
def test_login_failed_signal_creates_system_log():
    """Le signal user_login_failed crée une entrée system_logs login_failed (BACK-022A)."""
    from apps.core import signals  # noqa: F401 - connecte les receivers

    user_login_failed.send(
        sender=None,
        credentials={"email": "unknown@example.com"},
        request=None,
    )
    assert SystemLog.objects.filter(event_type="login_failed").exists()
    entry = SystemLog.objects.get(event_type="login_failed")
    assert "Échec" in entry.description or "authentification" in entry.description.lower()
    assert entry.metadata.get("username") == "unknown@example.com"


@pytest.mark.django_db
@pytest.mark.unit
def test_log_admin_action_creates_system_log(admin_user):
    """log_admin_action crée aussi une entrée system_logs admin_action (BACK-022A)."""
    from apps.users.utils import log_admin_action

    log_admin_action(
        admin_user=admin_user,
        action_type="user.suspend",
        target_type="user",
        target_id=42,
        description="Suspension abus",
    )
    assert SystemLog.objects.filter(event_type="admin_action").exists()
    entry = SystemLog.objects.get(event_type="admin_action")
    assert entry.description == "user.suspend"
    assert entry.metadata.get("target_type") == "user"
    assert entry.metadata.get("target_id") == 42
    assert entry.user_id == admin_user.id
