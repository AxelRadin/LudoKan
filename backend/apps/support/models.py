from django.conf import settings
from django.db import models


class SupportTicket(models.Model):
    """Ticket utilisateur pour bug / compte / autre (SAV)."""

    class Category(models.TextChoices):
        BUG = "bug", "Bug"
        ACCOUNT = "account", "Compte"
        OTHER = "other", "Autre"

    class Status(models.TextChoices):
        OPEN = "open", "Ouvert"
        IN_PROGRESS = "in_progress", "En cours"
        RESOLVED = "resolved", "Résolu"
        CLOSED = "closed", "Fermé"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_tickets",
    )
    category = models.CharField(max_length=32, choices=Category.choices)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    page_url = models.URLField(blank=True, max_length=2048)
    internal_note = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"#{self.pk} {self.subject[:40]}"
