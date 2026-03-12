"""
Signaux pour alimenter activity_logs et system_logs (BACK-021A).

- user_logged_in (Django) → ActivityLog(action=login)
- post_save Review (création) → ActivityLog(action=review_posted)

log_activity() depuis les vues/serializers ou ajouter un receiver ici.
"""

from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.dispatch import receiver

from .logging_utils import log_activity
from .models import ActivityLog


@receiver(user_logged_in)
def on_user_logged_in(sender, request, user, **kwargs):
    """Enregistre un login dans activity_logs."""
    log_activity(user, ActivityLog.Action.LOGIN, metadata={})


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
