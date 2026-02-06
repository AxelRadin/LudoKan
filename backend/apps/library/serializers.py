from rest_framework import serializers

from apps.games.models import Game, Genre, Platform, Publisher
from apps.library.models import UserGame


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
            "cover_url",
            "publisher",
            "genres",
            "platforms",
        ]


class UserGameSerializer(serializers.ModelSerializer):
    game = GameNestedSerializer(read_only=True)
    game_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = UserGame
        fields = ["id", "game", "game_id", "status", "date_added"]
        read_only_fields = ["date_added"]

    def validate_status(self, value):
        allowed = ["EN_COURS", "TERMINE", "ABANDONNE"]
        if value not in allowed:
            raise serializers.ValidationError(f"Le statut doit être l’un de : {', '.join(allowed)}")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        game_id = validated_data.pop("game_id", None)

        if not game_id:
            raise serializers.ValidationError({"game_id": "Ce champ est obligatoire."})

        try:
            game = Game.objects.get(id=game_id)
        except Game.DoesNotExist:
            raise serializers.ValidationError({"game_id": "Jeu non trouvé."})

        if UserGame.objects.filter(user=user, game=game).exists():
            raise serializers.ValidationError({"error": "Jeu déjà ajouté."})

        return UserGame.objects.create(user=user, game=game, **validated_data)

    def update(self, instance, validated_data):
        instance.status = validated_data.get("status", instance.status)
        instance.save()
        return instance
