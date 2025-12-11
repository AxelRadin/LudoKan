from rest_framework import serializers

from apps.games.models import Game, Publisher, Platform, Genre
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

