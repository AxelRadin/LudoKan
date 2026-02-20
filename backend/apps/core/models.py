from django.conf import settings
from django.db import models
from django.utils import timezone


class SystemLog(models.Model):
    """
    Log d'événements système pour le suivi et le débogage.
    """

    event_type = models.CharField(max_length=64, db_index=True)
    description = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_logs",
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "System log"
        verbose_name_plural = "System logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} @ {self.created_at}"


class ActivityLog(models.Model):
    """
    Log d'activité utilisateur (login, review_posted, rating_added, etc.).
    """

    class Action(models.TextChoices):
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        REVIEW_POSTED = "review_posted", "Review posted"
        RATING_ADDED = "rating_added", "Rating added"
        MESSAGE_SENT = "message_sent", "Message sent"
        LIBRARY_ADD = "library_add", "Game added to library"
        LIBRARY_REMOVE = "library_remove", "Game removed from library"
        PROFILE_UPDATE = "profile_update", "Profile updated"
        OTHER = "other", "Other"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="activity_logs",
    )
    action = models.CharField(max_length=32, choices=Action.choices, db_index=True)
    target_type = models.CharField(max_length=64, blank=True, db_index=True)
    target_id = models.PositiveBigIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "Activity log"
        verbose_name_plural = "Activity logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.action} @ {self.created_at}"


class ReportSchedule(models.Model):
    """
    Planification des rapports (users, games, activity) avec fréquence et destinataires.
    """

    class ReportType(models.TextChoices):
        USERS = "users", "Users"
        GAMES = "games", "Games"
        ACTIVITY = "activity", "Activity"

    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    report_type = models.CharField(max_length=32, choices=ReportType.choices, db_index=True)
    frequency = models.CharField(max_length=16, choices=Frequency.choices, db_index=True)
    recipients = models.JSONField(
        default=list,
        help_text="Liste d'adresses email des destinataires du rapport.",
    )
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True, db_index=True)
    enabled = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Report schedule"
        verbose_name_plural = "Report schedules"
        ordering = ["report_type", "frequency"]
        indexes = [
            models.Index(fields=["enabled", "next_run"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_report_type_display()} ({self.frequency})"
