from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django_fsm import FSMField, transition
from notifications.signals import notify

from apps.games.models import Genre, Platform


class GameTicket(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        REVIEWING = "reviewing", "Reviewing"
        APPROVED = "approved", "Approved"
        PUBLISHED = "published", "Published"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_tickets",
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_tickets",
    )

    game_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    publisher = models.CharField(max_length=255, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)

    players = models.CharField(max_length=50, blank=True)
    age = models.PositiveIntegerField(null=True, blank=True)

    genres = models.ManyToManyField(Genre, related_name="game_tickets", blank=True)
    platforms = models.ManyToManyField(Platform, related_name="game_tickets", blank=True)

    status = FSMField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        protected=True,
        db_index=True,
    )

    internal_comment = models.TextField(blank=True)
    internal_note = models.TextField(blank=True)
    admin_metadata = models.JSONField(default=dict, blank=True)

    rejection_reason = models.TextField(blank=True, null=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]
        ordering = ["-created_at"]

    @transition(field=status, source=Status.PENDING, target=Status.REVIEWING)
    def start_review(self):
        self.on_status_changed(GameTicket.Status.PENDING, GameTicket.Status.REVIEWING)

    @transition(field=status, source=Status.REVIEWING, target=Status.APPROVED)
    def approve(self):
        self.on_status_changed(GameTicket.Status.REVIEWING, GameTicket.Status.APPROVED)

    @transition(field=status, source=Status.REVIEWING, target=Status.REJECTED)
    def reject(self):
        self.on_status_changed(GameTicket.Status.REVIEWING, GameTicket.Status.REJECTED)

    @transition(field=status, source=Status.APPROVED, target=Status.PUBLISHED)
    def publish(self):
        self.on_status_changed(GameTicket.Status.APPROVED, GameTicket.Status.PUBLISHED)

    def on_status_changed(self, old_status, new_status):
        """
        Hook de notification / events
        """

        actor = self.reviewer if self.reviewer else self.user

        # Création de l'historique
        GameTicketHistory.objects.create(
            ticket=self,
            old_state=old_status,
            new_state=new_status,
            actor=actor,
            comment=self.rejection_reason if new_status == self.Status.REJECTED and self.rejection_reason else "",
        )

        status_to_verb = {
            self.Status.REVIEWING: "ticket_reviewing",
            self.Status.APPROVED: "ticket_approved",
            self.Status.REJECTED: "ticket_rejected",
            self.Status.PUBLISHED: "ticket_published",
        }

        verb = status_to_verb.get(new_status)
        if verb:
            extra_data = {
                "game_name": self.game_name,
                "old_status": old_status,
                "new_status": new_status,
            }
            if new_status == self.Status.REJECTED and self.rejection_reason:
                extra_data["rejection_reason"] = self.rejection_reason

            notify.send(
                sender=actor,
                recipient=self.user,
                verb=verb,
                target=self,
                **extra_data,
            )

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


class GameTicketHistory(models.Model):
    ticket = models.ForeignKey(
        GameTicket,
        on_delete=models.CASCADE,
        related_name="history",
    )
    old_state = models.CharField(max_length=20, choices=GameTicket.Status.choices)
    new_state = models.CharField(max_length=20, choices=GameTicket.Status.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_history_actions",
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name_plural = "Game ticket histories"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.ticket.game_name}: {self.old_state} -> {self.new_state}"


class GameTicketComment(models.Model):
    ticket = models.ForeignKey(
        GameTicket,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ticket_comments",
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.ticket}"


@receiver(post_save, sender=GameTicket)
def notify_admins_on_ticket_creation(sender, instance, created, **kwargs):
    """
    Notifie tous les administrateurs (is_staff=True) lors de la création d'un nouveau GameTicket.
    """
    if created:
        user_model = get_user_model()
        admins = user_model.objects.filter(is_staff=True)
        for admin in admins:
            notify.send(
                sender=instance.user,
                recipient=admin,
                verb="ticket_created",
                target=instance,
                game_name=instance.game_name,
            )
