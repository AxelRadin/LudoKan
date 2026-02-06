from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.games.models import Game


class MatchmakingRequestQuerySet(models.QuerySet):
    def pending(self):
        return self.filter(status=MatchmakingRequest.STATUS_PENDING)

    def active(self):
        """Requêtes encore valides (non expirées)."""
        return self.pending().filter(expires_at__gt=timezone.now())

    def expire_old(self) -> int:
        """
        Marque comme 'expired' toutes les requêtes expirées.

        Retourne le nombre de lignes affectées. Peut être utilisé par une
        tâche périodique Celery dans le futur.
        """
        return self.pending().filter(expires_at__lte=timezone.now()).update(status=MatchmakingRequest.STATUS_EXPIRED)


class MatchmakingRequest(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matchmaking_requests",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="matchmaking_requests",
    )

    latitude = models.FloatField()
    longitude = models.FloatField()

    # Optionnel (optimisation / future PostGIS migration)
    geohash = models.CharField(max_length=12, blank=True)

    radius_km = models.PositiveIntegerField(default=10)

    STATUS_PENDING = "pending"
    STATUS_MATCHED = "matched"
    STATUS_EXPIRED = "expired"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_MATCHED, "Matched"),
        (STATUS_EXPIRED, "Expired"),
    ]

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    objects = MatchmakingRequestQuerySet.as_manager()

    class Meta:
        indexes = [
            models.Index(fields=["status", "expires_at"]),
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["geohash"]),
        ]
        ordering = ["-created_at"]

    def is_expired(self) -> bool:
        return self.expires_at <= timezone.now()


class Match(models.Model):
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
        Game,
        on_delete=models.CASCADE,
        related_name="matches",
    )

    STATUS_ACTIVE = "active"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CLOSED, "Closed"),
    ]

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
