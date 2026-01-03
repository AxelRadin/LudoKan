from datetime import timedelta

from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GistIndex
from django.db import models
from django.utils import timezone


class MatchmakingSession(models.Model):
    """
    Optionnel : pour regrouper plusieurs MatchmakingRequest dans une même session.
    """

    name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name or f"Session {self.id}"


class MatchmakingRequest(models.Model):
    STATUS_PENDING = "pending"
    STATUS_MATCHED = "matched"
    STATUS_EXPIRED = "expired"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_MATCHED, "Matched"),
        (STATUS_EXPIRED, "Expired"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matchmaking_requests",
    )
    game = models.ForeignKey(
        "games.Game",
        on_delete=models.CASCADE,
        related_name="matchmaking_requests",
    )
    location = gis_models.PointField()
    radius_km = models.PositiveIntegerField(default=10)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    session = models.ForeignKey(
        MatchmakingSession,
        on_delete=models.SET_NULL,
        related_name="requests",
        null=True,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "expires_at"]),  # index classique
            GistIndex(fields=["location"]),
        ]
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Si expires_at n'est pas défini, on met 1h par défaut
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.game} ({self.status})"


class Match(models.Model):
    STATUS_ACTIVE = "active"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CLOSED, "Closed"),
    ]

    player1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matches_as_player1",
    )
    player2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matches_as_player2",
    )
    game = models.ForeignKey(
        "games.Game",
        on_delete=models.CASCADE,
        related_name="matches",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("player1", "player2", "game")  # optionnel, éviter doublons
        indexes = [
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.player1} vs {self.player2} - {self.game} ({self.status})"
