from django.conf import settings
from django.db import models

from apps.games.models import Genre, Platform


class GameTicket(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_tickets",
    )

    game_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)

    players = models.CharField(
        max_length=50,
        blank=True,
        help_text="Ex: 1-4, 2+, solo",
    )
    age = models.PositiveIntegerField(null=True, blank=True)

    genres = models.ManyToManyField(
        Genre,
        related_name="game_tickets",
        blank=True,
    )

    platforms = models.ManyToManyField(
        Platform,
        related_name="game_tickets",
        blank=True,
    )

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

    def __str__(self):
        return f"{self.game_name} ({self.status})"
