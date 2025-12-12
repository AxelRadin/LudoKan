from django.db.models.base import ValidationError
from rest_framework import serializers

from apps.games.models import Game, Publisher, Platform, Genre, Rating
from apps.library.serializers import (
    PublisherSerializer,
    GenreSerializer,
    PlatformSerializer,
)


class GameReadSerializer(serializers.ModelSerializer):
    publisher = PublisherSerializer()
    genres = GenreSerializer(many=True)
    platforms = PlatformSerializer(many=True)

    class Meta:
        model = Game
        fields = [
            "id",
            "igdb_id",
            "name",
            "description",
            "release_date",
            "cover_url",
            "status",
            "min_players",
            "max_players",
            "min_age",
            "rating_avg",
            "average_rating",
            "rating_count",
            "popularity_score",
            "publisher",
            "genres",
            "platforms",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class GameWriteSerializer(serializers.ModelSerializer):
    publisher = serializers.PrimaryKeyRelatedField(queryset=Publisher.objects.all())
    genres = serializers.PrimaryKeyRelatedField(
        queryset=Genre.objects.all(),
        many=True,
    )
    platforms = serializers.PrimaryKeyRelatedField(
        queryset=Platform.objects.all(),
        many=True,
    )

    class Meta:
        model = Game
        fields = [
            "id",
            "igdb_id",
            "name",
            "description",
            "release_date",
            "cover_url",
            "status",
            "min_players",
            "max_players",
            "min_age",
            "rating_avg",
            "average_rating",
            "rating_count",
            "popularity_score",
            "publisher",
            "genres",
            "platforms",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "rating_avg",
            "average_rating",
            "rating_count",
            "popularity_score",
        ]


class PublisherCRUDSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = [
            "id",
            "igdb_id",
            "name",
            "description",
            "website",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GenreCRUDSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = [
            "id",
            "igdb_id",
            "nom_genre",
            "description",
        ]


class PlatformCRUDSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = [
            "id",
            "igdb_id",
            "nom_plateforme",
            "description",
        ]


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = [
            "id",
            "game",
            "user",
            "rating_type",
            "value",
        ]
        read_only_fields = ["id", "game", "user"]

    def validate(self, attrs):
        """Reuse the model's clean() logic for range/type validation.

        We no longer enforce decimal place count here so that both integers
        and decimals in [0, 10] are accepted for the `decimal` rating type.
        """
        RatingModel = self.Meta.model

        rating_type = attrs.get("rating_type") or getattr(self.instance, "rating_type", None)
        value = attrs.get("value") or getattr(self.instance, "value", None)

        # Let the model handle value/range validation
        tmp = RatingModel(
            rating_type=rating_type,
            value=value,
        )
        tmp.clean()

        return attrs
