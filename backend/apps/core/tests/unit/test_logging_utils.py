"""
Couverture des helpers log_activity et log_system_event.
"""

import pytest

from apps.core.logging_utils import log_activity, log_system_event
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
