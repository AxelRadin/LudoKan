from django.db import models
from django.conf import settings

from apps.games.models import Game, Rating
from apps.reviews.validators import validate_review_content_length


class Review(models.Model):
    """
    Avis utilisateur sur un jeu.
    Un utilisateur ne peut laisser qu'un seul avis par jeu.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    rating = models.ForeignKey(
        Rating,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews"
    )

    content = models.TextField(validators=[validate_review_content_length])
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'game'],
                name='unique_user_game_review'
            )
        ]
        ordering = ['-date_created']
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
