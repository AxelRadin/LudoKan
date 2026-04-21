from django.conf import settings
from django.db import models

from apps.chat.models import ChatRoom
from apps.games.models import Game


class GamePartyMemberQuerySet(models.QuerySet):
    def active(self):
        return self.filter(membership_status="active")


class GamePartyMemberManager(models.Manager):
    def get_queryset(self):
        return GamePartyMemberQuerySet(self.model, using=self._db)

    def active(self):
        return self.get_queryset().active()


class GameParty(models.Model):
    """
    Groupe de joueurs (lobby) pour une partie, jusqu'à l'ouverture éventuelle du chat.
    """

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        WAITING_READY = "waiting_ready", "Waiting ready"
        WAITING_READY_FOR_CHAT = "waiting_ready_for_chat", "Waiting ready for chat"
        COUNTDOWN = "countdown", "Countdown"
        CHAT_ACTIVE = "chat_active", "Chat active"
        CANCELLED = "cancelled", "Cancelled"

    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="game_parties",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    max_players = models.PositiveIntegerField()

    chat_room = models.OneToOneField(
        ChatRoom,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="game_party",
    )

    open_deadline_at = models.DateTimeField(null=True, blank=True)
    ready_deadline_at = models.DateTimeField(null=True, blank=True)
    ready_for_chat_deadline_at = models.DateTimeField(null=True, blank=True)
    countdown_started_at = models.DateTimeField(null=True, blank=True)
    countdown_ends_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Game party"
        verbose_name_plural = "Game parties"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "open_deadline_at"], name="parties_gam_status_6e4f8e_idx"),
            models.Index(fields=["status", "countdown_ends_at"], name="parties_gam_status_8a1c2d_idx"),
            models.Index(fields=["game", "status"], name="parties_gam_game_id_3f9b2a_idx"),
        ]

    def __str__(self) -> str:
        return f"GameParty(id={self.pk}, game_id={self.game_id}, status={self.status})"

    def active_members(self):
        # Le RelatedManager reverse n'expose pas les méthodes du manager custom.
        return self.members.filter(membership_status=GamePartyMember.MembershipStatus.ACTIVE)

    def active_member_count(self) -> int:
        return self.active_members().count()


class GamePartyMember(models.Model):
    """
    Appartenance d'un utilisateur à une party et états de consentement.
    """

    class MembershipStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        DECLINED = "declined", "Declined"
        TIMED_OUT = "timed_out", "Timed out"
        LEFT = "left", "Left"

    class ReadyState(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        TIMED_OUT = "timed_out", "Timed out"

    class ReadyForChatState(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        TIMED_OUT = "timed_out", "Timed out"

    party = models.ForeignKey(
        GameParty,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="party_memberships",
    )

    membership_status = models.CharField(
        max_length=16,
        choices=MembershipStatus.choices,
        default=MembershipStatus.ACTIVE,
        db_index=True,
    )
    ready_state = models.CharField(
        max_length=16,
        choices=ReadyState.choices,
        default=ReadyState.PENDING,
        db_index=True,
    )
    ready_for_chat_state = models.CharField(
        max_length=16,
        choices=ReadyForChatState.choices,
        default=ReadyForChatState.PENDING,
        db_index=True,
    )

    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = GamePartyMemberManager()

    class Meta:
        verbose_name = "Game party member"
        verbose_name_plural = "Game party members"
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(fields=["party", "user"], name="unique_party_user"),
        ]
        indexes = [
            models.Index(fields=["party", "membership_status"], name="parties_gam_party_i_7c4e1b_idx"),
            models.Index(fields=["party", "ready_state"], name="parties_gam_party_i_9d2a5f_idx"),
            models.Index(fields=["party", "ready_for_chat_state"], name="parties_gam_party_i_a3e8c1_idx"),
        ]

    def __str__(self) -> str:
        return f"GamePartyMember(party_id={self.party_id}, user_id={self.user_id})"
