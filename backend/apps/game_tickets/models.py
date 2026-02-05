from django.conf import settings
from django.db import models
from django_fsm import FSMField, transition

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
