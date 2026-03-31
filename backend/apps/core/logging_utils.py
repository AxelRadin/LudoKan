"""
Helpers pour créer des entrées dans system_logs et activity_logs.

Utilisation :
- log_activity(user, action, target_type=..., target_id=..., metadata=...)
- log_email_event(event_type, mail_type=..., recipients=..., exception=..., extra_metadata=...)
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


def log_email_event(
    event_type: str,
    *,
    mail_type: str,
    recipients: list[str],
    description: str = "",
    exception: BaseException | None = None,
    extra_metadata: dict | None = None,
):
    """
    Enregistre un événement lié à l’envoi d’e-mail dans system_logs.

    event_type attendus : email_send_requested, email_send_succeeded,
    email_send_failed, email_quota_blocked.
    """
    from django.conf import settings

    metadata = {
        "environment": getattr(settings, "ENVIRONMENT", "unknown"),
        "mail_type": mail_type,
        "recipients": list(recipients),
        "recipient_count": len(recipients),
    }
    if exception is not None:
        metadata["exception"] = f"{type(exception).__name__}: {exception}"
    if extra_metadata:
        metadata.update(extra_metadata)
    log_system_event(
        event_type,
        description or event_type,
        metadata=metadata,
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
