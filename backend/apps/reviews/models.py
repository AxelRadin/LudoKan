from django.conf import settings
from django.db import models

from apps.games.models import Game, Rating
from apps.reviews.validators import validate_review_content_length


class Review(models.Model):
    """
    Avis utilisateur sur un jeu.
    Un utilisateur ne peut laisser qu'un seul avis par jeu.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="reviews")

    rating = models.ForeignKey(Rating, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviews")

    content = models.TextField(validators=[validate_review_content_length])
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "game"], name="unique_user_game_review")]
        ordering = ["-date_created"]
        verbose_name = "Review"
        verbose_name_plural = "Reviews"

    def __str__(self):
        return f"{self.user.pseudo} - {self.game.name}"

    def save(self, *args, **kwargs):
        """
        Surcharge de save pour appeler clean() automatiquement.
        """
        self.full_clean()
        super().save(*args, **kwargs)


class ContentReport(models.Model):
    """
    Signalement d'un contenu utilisateur (review ou rating).

    Tous les utilisateurs peuvent signaler un contenu, une seule fois
    par cible (reporter, target_type, target_id).
    """

    class TargetType(models.TextChoices):
        REVIEW = "review", "Review"
        RATING = "rating", "Rating"

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="content_reports",
    )
    target_type = models.CharField(max_length=20, choices=TargetType.choices)
    target_id = models.PositiveBigIntegerField()
    reason = models.TextField()
    handled = models.BooleanField(default=False)
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_reports",
    )
    handled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("reporter", "target_type", "target_id")
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
        ]
        verbose_name = "Content report"
        verbose_name_plural = "Content reports"

    def __str__(self) -> str:
        return f"Report by {self.reporter_id} on {self.target_type}#{self.target_id}"
