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
    game = GameNestedSerializer(read_only=True)
    game_id = serializers.IntegerField(write_only=True, required=True)

    class Meta:
        model = UserGame
        fields = ["id", "game", "game_id", "status", "date_added"]

    def create(self, validated_data):
        user = self.context["request"].user
        game_id = validated_data.pop("game_id")

        # Vérifie que le jeu existe
        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            raise serializers.ValidationError({"game_id": "Jeu non trouvé."})

        # Vérifie les doublons
        if UserGame.objects.filter(user=user, game=game).exists():
            raise serializers.ValidationError({"error": "Jeu déjà ajouté."})

        # Crée et retourne l'objet UserGame
        return UserGame.objects.create(user=user, game=game, **validated_data)
