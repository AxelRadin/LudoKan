from django.conf import settings
from django.db import models

from apps.games.models import Game


class UserGame(models.Model):
    class Status(models.TextChoices):
        PLAYING = "playing", "Playing"
        FINISHED = "finished", "Finished"
        ABANDONED = "abandoned", "Abandoned"
        WISHLIST = "wishlist", "Wishlist"
        EN_COURS = "EN_COURS", "En cours"
        TERMINE = "TERMINE", "Terminé"
        ABANDONNE = "ABANDONNE", "Abandonné"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="library_entries",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="user_games",
        null=True,
        blank=True,
    )
    igdb_game_id = models.PositiveBigIntegerField(null=True, blank=True, help_text="ID du jeu côté IGDB (optionnel).")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLAYING,
    )
    hours_played = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Nombre d'heures jouées (optionnel).",
    )
    date_added = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "game", "igdb_game_id")
        verbose_name = "Jeu de la ludothèque"
        verbose_name_plural = "Ludothèque utilisateurs"
        ordering = ["-date_added"]
        indexes = [
            models.Index(fields=["game", "status"]),
        ]

    def __str__(self):
        game_display = self.game if self.game else self.igdb_game_id
        return f"UserGame: {self.user} - {game_display} ({self.status})"

    def is_owned_by(self, user):
        return self.user == user
