from rest_framework import serializers
from apps.library.models import UserGame
from apps.games.models import Game, Publisher, Platform, Genre


class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ["id", "name"]


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "nom_genre"]


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = ["id", "nom_plateforme"]


class GameNestedSerializer(serializers.ModelSerializer):
    publisher = PublisherSerializer()
    genres = GenreSerializer(many=True)
    platforms = PlatformSerializer(many=True)

    class Meta:
        model = Game
        fields = [
            "id",
            "name",
            "description",
            "release_date",
            "min_players",
            "max_players",
            "min_age",
            "rating_avg",
            "popularity_score",
            "publisher",
            "genres",
            "platforms",
        ]


class UserGameSerializer(serializers.ModelSerializer):
    game = GameNestedSerializer()

    class Meta:
        model = UserGame
        fields = ["id", "game", "status", "date_added"]
