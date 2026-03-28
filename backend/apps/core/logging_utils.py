"""
Helpers pour créer des entrées dans system_logs et activity_logs.

Utilisation :
- log_activity(user, action, target_type=..., target_id=..., metadata=...)
- log_system_event(event_type, description, user=..., metadata=...)

Les logs peuvent aussi être créés via les signaux (login, création de review, etc.)
définis dans core.signals.
"""

from django.contrib.auth import get_user_model

from .models import ActivityLog, SystemLog

User = get_user_model()


def log_activity(
    user,
    action: str,
    *,
    target_type: str = "",
    target_id: int | None = None,
    metadata: dict | None = None,
):
    """
    Crée une entrée dans activity_logs.

    :param user: instance CustomUser (requis)
    :param action: valeur parmi ActivityLog.Action (ex. "login", "review_posted")
    :param target_type: type de cible optionnel (ex. "review", "game")
    :param target_id: id de la cible optionnel
    :param metadata: dict JSON optionnel
    """
    ActivityLog.objects.create(
        user=user,
        action=action,
        target_type=target_type or "",
        target_id=target_id,
        metadata=metadata or {},
    )


def log_system_event(
    event_type: str,
    description: str = "",
    *,
    user=None,
    metadata: dict | None = None,
):
    """
    Crée une entrée dans system_logs.

    :param event_type: type d'événement (ex. "server_start", "backup_ok", "export_done")
    :param description: texte libre
    :param user: utilisateur optionnel (FK)
    :param metadata: dict JSON optionnel
    """
    SystemLog.objects.create(
        event_type=event_type,
        description=description,
        user=user,
        metadata=metadata or {},
    )


def log_activity_anomaly(description: str, *, metadata: dict | None = None):
    """
    Log une anomalie d'activité (pic, spam, etc.) dans system_logs.
    À appeler depuis un middleware, une tâche ou une vue qui détecte un comportement anormal.
    """
    log_system_event("activity_anomaly", description, metadata=metadata or {})
