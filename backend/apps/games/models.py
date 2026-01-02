from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Avg
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

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
    description = models.TextField(blank=True, default="")
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Platform(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    nom_plateforme = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.nom_plateforme


class Genre(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    nom_genre = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.nom_genre


class Game(models.Model):
    # IGDB ID pour la recherche sur IGDB
    igdb_id = models.PositiveBigIntegerField(unique=True, null=True, blank=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    release_date = models.DateField(blank=True, null=True)
    cover_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, choices=GAME_STATUS_CHOICES)

    min_players = models.IntegerField(blank=True, null=True)
    max_players = models.IntegerField(blank=True, null=True)
    min_age = models.IntegerField(blank=True, null=True)
    rating_avg = models.FloatField(default=0.0)
    popularity_score = models.FloatField(default=0.0)
    # New fields for rating statistics
    average_rating = models.FloatField(default=0.0)
    rating_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    publisher = models.ForeignKey(Publisher, on_delete=models.CASCADE, related_name="games")
    platforms = models.ManyToManyField(Platform, related_name="games")
    genres = models.ManyToManyField(Genre, related_name="games")

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
    # Normalized rating on a 0-10 scale (used for averaging)
    normalized_value = models.FloatField(default=0.0)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "game")
        verbose_name = "Rating"
        verbose_name_plural = "Ratings"

    def __str__(self):
        return f"{self.user} - {self.game} ({self.value})"

    def clean(self):
        """Validate the rating value depending on rating_type.

        - sur_100: 0 <= value <= 100
        - sur_10: 0 <= value <= 10
        - decimal: 0 <= value <= 10
        - etoiles: 1 <= value <= 5
        """
        from django.core.exceptions import ValidationError

        super().clean()

        if self.value is None or self.rating_type is None:
            return

        # Ensure we are working with a Decimal instance
        if not isinstance(self.value, Decimal):
            self.value = Decimal(str(self.value))

        # Map rating types to (min_value, max_value, error_message)
        ranges = {
            self.RATING_TYPE_SUR_100: (0, 100, "Rating out of range for type 'sur_100' (0-100)."),
            self.RATING_TYPE_SUR_10: (0, 10, "Rating out of range for type 'sur_10' (0-10)."),
            self.RATING_TYPE_DECIMAL: (0, 10, "Rating out of range for type 'decimal' (0-10)."),
            self.RATING_TYPE_ETOILES: (1, 5, "Rating out of range for type 'etoiles' (1-5)."),
        }

        if self.rating_type not in ranges:
            raise ValidationError({"rating_type": "Unknown rating type."})

        min_value, max_value, message = ranges[self.rating_type]
        if not (min_value <= self.value <= max_value):
            raise ValidationError({"value": message})

    def save(self, *args, **kwargs):
        """Override save to keep normalized_value in sync.

        Also ensures normalized_value is written even when update_fields is
        provided (e.g. via update_or_create), so averages use the latest value.
        """
        if self.rating_type and self.value is not None:
            self.normalized_value = normalize_rating(self.rating_type, self.value)

            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                # Ensure normalized_value is included in partial updates
                # update_fields may be a set or iterable; normalize to set then back
                update_fields_set = set(update_fields)
                update_fields_set.add("normalized_value")
                kwargs["update_fields"] = update_fields_set

        super().save(*args, **kwargs)


def normalize_rating(rating_type, value):
    """Normalize a rating value to a 0-10 scale.

    - sur_100: value / 10
    - sur_10: unchanged
    - decimal: unchanged
    - etoiles: value * 2 (1-5 stars -> 2-10)
    """
    if value is None:
        return 0.0

    if not isinstance(value, Decimal):
        value = Decimal(str(value))

    if rating_type == Rating.RATING_TYPE_SUR_100:
        normalized = value / Decimal("10")
    elif rating_type == Rating.RATING_TYPE_SUR_10:
        normalized = value
    elif rating_type == Rating.RATING_TYPE_DECIMAL:
        normalized = value
    elif rating_type == Rating.RATING_TYPE_ETOILES:
        normalized = value * Decimal("2")
    else:
        normalized = value

    return float(normalized)


def _update_game_rating_stats(game):
    """Recalculate average_rating and rating_count for a game.

    Also keeps legacy rating_avg in sync for backward compatibility.
    """
    agg = Rating.objects.filter(game=game).aggregate(avg_normalized=Avg("normalized_value"))
    avg = agg["avg_normalized"] or 0.0
    count = Rating.objects.filter(game=game).count()

    game.average_rating = avg
    game.rating_count = count
    # Keep existing rating_avg field aligned with the new average
    game.rating_avg = avg
    game.save(update_fields=["average_rating", "rating_count", "rating_avg"])


@receiver(post_save, sender=Rating)
def update_game_rating_on_save(sender, instance, **kwargs):
    """Update game's average_rating and rating_count after save."""
    _update_game_rating_stats(instance.game)


@receiver(post_delete, sender=Rating)
def update_game_rating_on_delete(sender, instance, **kwargs):
    """Update game's average_rating and rating_count after delete."""
    _update_game_rating_stats(instance.game)
