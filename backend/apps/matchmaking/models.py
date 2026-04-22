from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.games.models import Game


class MatchmakingRequestQuerySet(models.QuerySet):
    def pending(self):
        return self.filter(status=MatchmakingRequest.STATUS_PENDING)

    def active(self):
        return self.pending().filter(expires_at__gt=timezone.now())

    def expire_old(self) -> int:
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

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
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
    player1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matches_as_player1")
    player2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matches_as_player2")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="matches")

    STATUS_ACTIVE = "active"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_CLOSED, "Closed"),
    ]

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)


# ==========================================
# MODÈLES : LOBBY / PARTY
# ==========================================

class GameParty(models.Model):
    STATUS_OPEN = "open"
    STATUS_COUNTDOWN = "countdown"
    STATUS_CHAT_ACTIVE = "chat_active"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Ouvert / En formation"),
        (STATUS_COUNTDOWN, "Compte à rebours en cours"),
        (STATUS_CHAT_ACTIVE, "Discussion active"),
        (STATUS_CANCELLED, "Annulé"),
    ]

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="parties")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    max_players = models.PositiveIntegerField(default=2) # Ou défini dynamiquement selon le jeu
    
    countdown_ends_at = models.DateTimeField(null=True, blank=True)
    chat_room_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_full(self):
        return self.members.count() >= self.max_players

class GamePartyMember(models.Model):
    party = models.ForeignKey(GameParty, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    ready = models.BooleanField(default=False)
    ready_for_chat = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('party', 'user')