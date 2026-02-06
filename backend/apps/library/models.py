from django.conf import settings
from django.db import models
from django.conf import settings

class UserGame(models.Model):
    class Status(models.TextChoices):
        PLAYING = "playing", "Playing"
        FINISHED = "finished", "Finished"
        ABANDONED = "abandoned", "Abandoned"
        WISHLIST = "wishlist", "Wishlist"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="library_games",
    )
    igdb_game_id = models.PositiveBigIntegerField()  # ID du jeu côté IGDB

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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "igdb_game_id")
        verbose_name = "User Game"
        verbose_name_plural = "User Games"

    def __str__(self) -> str:
        return f"{self.user} → {self.igdb_game_id} ({self.status})"


from apps.games.models import Game


class UserGame(models.Model):
    class GameStatus(models.TextChoices):
        EN_COURS = "EN_COURS", "En cours"
        TERMINE = "TERMINE", "Terminé"
        ABANDONNE = "ABANDONNE", "Abandonné"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="library_entries")

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="user_games")

    status = models.CharField(max_length=20, choices=GameStatus.choices, default=GameStatus.EN_COURS)

    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "game")
        verbose_name = "Jeu de la ludothèque"
        verbose_name_plural = "Ludothèque utilisateurs"
        ordering = ["-date_added"]
        indexes = [
            models.Index(fields=["game", "status"]),
        ]

    def __str__(self):
        return f"UserGame: {self.user} - {self.game} ({self.status})"

    def is_owned_by(self, user):
        return self.user == user
