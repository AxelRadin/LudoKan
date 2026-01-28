from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.games.models import Genre, Platform


class GameTicket(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWING = "reviewing", "Reviewing"
        APPROVED = "approved", "Approved"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"

    ALLOWED_TRANSITIONS = {
        Status.PENDING: [Status.REVIEWING],
        Status.REVIEWING: [Status.APPROVED, Status.REJECTED],
        Status.APPROVED: [Status.PUBLISHED],
        Status.PUBLISHED: [],
        Status.REJECTED: [],
    }

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_tickets",
    )

    game_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)

    players = models.CharField(max_length=50, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)

    genres = models.ManyToManyField(Genre, related_name="game_tickets", blank=True)
    platforms = models.ManyToManyField(Platform, related_name="game_tickets", blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    def change_status(self, new_status: str):
        allowed = self.ALLOWED_TRANSITIONS.get(self.status, [])

        if new_status not in allowed:
            raise ValidationError(f"Invalid status transition: {self.status} → {new_status}")

        old_status = self.status
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])

        self.on_status_changed(old_status, new_status)

    def on_status_changed(self, old_status, new_status):
        """
        Hook de notification / events
        """

        pass

    def __str__(self):
        return f"{self.game_name} ({self.status})"


class GameTicketAttachment(models.Model):
    ticket = models.ForeignKey(
        GameTicket,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="game_tickets/attachments/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for ticket {self.ticket_id}"
