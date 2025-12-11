from django.db import models
from django.conf import settings
from decimal import Decimal

GAME_STATUS_CHOICES = [
        ("released", "Released"),
        ("alpha", "Alpha"),
        ("beta", "Beta"),
        ("early_access", "Early Access"),
        ("offline", "Offline"),
        ("cancelled", "Cancelled"),
        ("rumored", "Rumored"),
        ("delisted", "Delisted"),
    ]

class Publisher(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Platform(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    nom_plateforme = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_plateforme


class Genre(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    nom_genre = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_genre

class Game(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    cover_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20,blank=True,null=True,choices=GAME_STATUS_CHOICES,)

    min_players = models.IntegerField(blank=True, null=True)
    max_players = models.IntegerField(blank=True, null=True)
    min_age = models.IntegerField(blank=True, null=True)
    rating_avg = models.FloatField(default=0.0)
    popularity_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    publisher = models.ForeignKey(Publisher, on_delete=models.CASCADE, related_name='games')
    platforms = models.ManyToManyField(Platform, related_name='games')
    genres = models.ManyToManyField(Genre, related_name='games')

    def __str__(self):
        return self.name


class Rating(models.Model):
    """
    Rating given by a user to a game.
    Supports multiple rating types with specific validation rules.
    """

    RATING_TYPE_SUR_100 = "sur_100"
    RATING_TYPE_SUR_10 = "sur_10"
    RATING_TYPE_DECIMAL = "decimal"
    RATING_TYPE_ETOILES = "etoiles"

    RATING_TYPE_CHOICES = [
        (RATING_TYPE_SUR_100, "Out of 100"),
        (RATING_TYPE_SUR_10, "Out of 10"),
        (RATING_TYPE_DECIMAL, "Decimal (0.0 - 10.0)"),
        (RATING_TYPE_ETOILES, "Stars (1-5)"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    game = models.ForeignKey(
        Game,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    rating_type = models.CharField(max_length=20, choices=RATING_TYPE_CHOICES)
    value = models.DecimalField(max_digits=5, decimal_places=2)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "game")
        verbose_name = "Rating"
        verbose_name_plural = "Ratings"

    def __str__(self):
        return f"{self.user} - {self.game} ({self.value})"

    def clean(self):
        """
        Validate the rating value depending on rating_type.

        - sur_100: 0 <= value <= 100
        - sur_10: 0 <= value <= 10
        - decimal: 0 <= value <= 10 (max 1 decimal place)
        - etoiles: 1 <= value <= 5
        """
        from django.core.exceptions import ValidationError

        super().clean()

        if self.value is None or self.rating_type is None:
            return

        # Ensure we are working with a Decimal instance
        if not isinstance(self.value, Decimal):
            self.value = Decimal(str(self.value))

        if self.rating_type == self.RATING_TYPE_SUR_100:
            if self.value < 0 or self.value > 100:
                raise ValidationError(
                    {"value": "Rating out of range for type 'sur_100' (0-100)."}
                )

        elif self.rating_type == self.RATING_TYPE_SUR_10:
            if self.value < 0 or self.value > 10:
                raise ValidationError(
                    {"value": "Rating out of range for type 'sur_10' (0-10)."}
                )

        elif self.rating_type == self.RATING_TYPE_DECIMAL:
            if self.value < 0 or self.value > 10:
                raise ValidationError(
                    {"value": "Rating out of range for type 'decimal' (0-10)."}
                )

        elif self.rating_type == self.RATING_TYPE_ETOILES:
            if self.value < 1 or self.value > 5:
                raise ValidationError(
                    {"value": "Rating out of range for type 'etoiles' (1-5)."}
                )

        else:
            raise ValidationError({"rating_type": "Unknown rating type."})
