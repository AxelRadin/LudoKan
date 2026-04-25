from django.conf import settings
from django.db import models

from apps.games.models import Game


class UserLibrary(models.Model):
    """
    Collection nommée (liste) regroupant des UserGame sans dupliquer les jeux.
    Les collections système (Ma ludothèque, Jeux Steam) ont ``system_key`` renseigné.
    """

    class SystemKey(models.TextChoices):
        MA_LUDOTHEQUE = "MA_LUDOTHEQUE", "Ma ludothèque"
        STEAM = "STEAM", "Jeux Steam"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="libraries",
    )
    name = models.CharField(max_length=120)
    color = models.CharField(
        max_length=7,
        blank=True,
        default="",
        help_text="Couleur hex optionnelle, ex. #d32f2f",
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(
        default=False,
        help_text="Vrai pour la collection principale « Ma ludothèque ».",
    )
    is_visible_on_profile = models.BooleanField(
        default=False,
        help_text="Si vrai, la collection peut être listée sur le profil public.",
    )
    system_key = models.CharField(
        max_length=32,
        blank=True,
        default="",
        choices=SystemKey.choices,
        help_text="Vide pour les collections utilisateur ; valeur enum pour les collections système.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Collection utilisateur"
        verbose_name_plural = "Collections utilisateur"
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "system_key"],
                condition=models.Q(
                    system_key__in=[
                        "MA_LUDOTHEQUE",
                        "STEAM",
                    ]
                ),
                name="library_user_system_key_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.user} — {self.name}"

    @property
    def is_system(self) -> bool:
        return bool(self.system_key)


class UserLibraryEntry(models.Model):
    """Appartenance d’un UserGame à une collection."""

    library = models.ForeignKey(
        UserLibrary,
        on_delete=models.CASCADE,
        related_name="entries",
    )
    user_game = models.ForeignKey(
        "UserGame",
        on_delete=models.CASCADE,
        related_name="library_entries",
    )
    date_added = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Entrée de collection"
        verbose_name_plural = "Entrées de collections"
        constraints = [
            models.UniqueConstraint(
                fields=["library", "user_game"],
                name="library_entry_library_usergame_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.library_id} → UserGame {self.user_game_id}"


class UserGame(models.Model):
    class GameStatus(models.TextChoices):
        ENVIE_DE_JOUER = "ENVIE_DE_JOUER", "Envie de jouer"
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
    )
    status = models.CharField(
        max_length=20,
        choices=GameStatus.choices,
        default=GameStatus.EN_COURS,
    )
    is_favorite = models.BooleanField(default=False)
    playtime_forever = models.FloatField(default=0.0, help_text="Temps de jeu total en heures")
    date_added = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "game")
        verbose_name = "Jeu de la ludothèque"
        verbose_name_plural = "Ludothèque utilisateurs"
        ordering = ["-date_modified"]
        indexes = [
            models.Index(fields=["game", "status"]),
        ]

    def __str__(self):
        return f"UserGame: {self.user} - {self.game} ({self.status})"

    def is_owned_by(self, user):
        return self.user == user
