"""
Signaux pour alimenter activity_logs et system_logs (BACK-021A).

- user_logged_in (Django) → ActivityLog(action=login)
- post_save Review (création) → ActivityLog(action=review_posted)

log_activity() depuis les vues/serializers ou ajouter un receiver ici.
"""

from django.contrib.admin.models import LogEntry
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db.models.signals import post_save
from django.dispatch import receiver

from .logging_utils import log_activity, log_system_event
from .models import ActivityLog


@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    """Enregistre un login dans activity_logs."""
    log_activity(user, ActivityLog.Action.LOGIN, metadata={})


@receiver(user_login_failed)
def on_user_login_failed(sender, credentials, request, **kwargs):
    """Enregistre un échec de login dans system_logs."""
    email_attempt = credentials.get("email", "unknown")
    ip_address = request.META.get("REMOTE_ADDR") if request else None

    log_system_event(
        event_type="login_failed",
        description=f"Échec de connexion pour l'email: {email_attempt}",
        metadata={"email": email_attempt, "ip": ip_address},
    )


@receiver(post_save, sender=LogEntry)
def on_admin_action(sender, instance, created, **kwargs):
    """Enregistre une action d'administration dans system_logs."""
    if created:
        log_system_event(
            event_type="admin_action",
            description=f"Action d'administration: {instance.action_flag} sur {instance.object_repr}",
            user=instance.user,
            metadata={
                "action_time": instance.action_time.isoformat(),
                "object_id": instance.object_id,
                "object_repr": instance.object_repr,
                "action_flag": instance.action_flag,
                "change_message": instance.change_message,
                "content_type_id": instance.content_type_id,
            },
        )


def _on_review_created(sender, instance, created, **kwargs):
    if not created:
        return
    log_activity(
        instance.user,
        ActivityLog.Action.REVIEW_POSTED,
        target_type="review",
        target_id=instance.pk,
        metadata={"game_id": instance.game_id},
    )


def connect_review_signal():
    """Connecte le signal Review post_save (évite import circulaire au chargement)."""
    from apps.reviews.models import Review

    post_save.connect(_on_review_created, sender=Review, weak=False)
