from django.conf import settings
from django.db import models


class Friendship(models.Model):
    """
    Amitié symétrique entre deux utilisateurs, stockée avec user_a_id < user_b_id.
    """

    user_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_as_low",
    )
    user_b = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_as_high",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Amitié"
        verbose_name_plural = "Amitiés"
        constraints = [
            models.UniqueConstraint(fields=["user_a", "user_b"], name="social_friendship_user_pair_uniq"),
            models.CheckConstraint(
                check=models.Q(user_a_id__lt=models.F("user_b_id")),
                name="social_friendship_ordered_users",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user_a_id} — {self.user_b_id}"


class FriendRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        ACCEPTED = "accepted", "Acceptée"
        DECLINED = "declined", "Refusée"
        CANCELLED = "cancelled", "Annulée"

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friend_requests_sent",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friend_requests_received",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Demande d’ami"
        verbose_name_plural = "Demandes d’amis"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["to_user", "status"]),
            models.Index(fields=["from_user", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["from_user", "to_user"],
                condition=models.Q(status="pending"),
                name="social_friendrequest_pending_pair_uniq",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.from_user_id} → {self.to_user_id} ({self.status})"
