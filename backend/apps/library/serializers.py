from django.db.models import Max
from rest_framework import serializers

from apps.games.models import Game, Genre, Platform, Publisher
from apps.library.models import UserGame, UserLibrary


class PublisherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Publisher
        fields = ["id", "name"]


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "name"]


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = ["id", "name"]


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
            "steam_appid",
        ]


class UserGameSerializer(serializers.ModelSerializer):
    game = GameNestedSerializer(read_only=True)
    game_id = serializers.IntegerField(write_only=True, required=False)
    collection_ids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserGame
        fields = [
            "id",
            "game",
            "game_id",
            "status",
            "is_favorite",
            "date_added",
            "playtime_forever",
            "collection_ids",
        ]
        read_only_fields = ["date_added", "playtime_forever", "collection_ids"]

    def get_collection_ids(self, obj: UserGame) -> list[int]:
        return list(obj.library_entries.exclude(library__system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE).values_list("library_id", flat=True))

    def validate_status(self, value):
        allowed = ["EN_COURS", "TERMINE", "ABANDONNE", "ENVIE_DE_JOUER"]
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
        instance.is_favorite = validated_data.get("is_favorite", instance.is_favorite)
        instance.save()
        return instance


class UserLibrarySerializer(serializers.ModelSerializer):
    games_count = serializers.IntegerField(read_only=True)
    is_system = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserLibrary
        fields = [
            "id",
            "name",
            "color",
            "sort_order",
            "is_default",
            "is_visible_on_profile",
            "system_key",
            "is_system",
            "games_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_default",
            "system_key",
            "is_system",
            "games_count",
            "created_at",
            "updated_at",
        ]

    def get_is_system(self, obj: UserLibrary) -> bool:
        return obj.is_system

    def validate_name(self, value: str) -> str:
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Le nom ne peut pas être vide.")
        return v

    def validate_color(self, value: str) -> str:
        if not value:
            return ""
        v = value.strip()
        if len(v) != 7 or not v.startswith("#"):
            raise serializers.ValidationError("Utilise une couleur hex (#RRGGBB).")
        return v

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.system_key:
            allowed = {"is_visible_on_profile", "color"}
            extra = set(attrs) - allowed
            if extra:
                raise serializers.ValidationError("Cette collection système ne peut modifier que la visibilité sur le profil et la couleur.")
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        max_order = UserLibrary.objects.filter(user=user).aggregate(m=Max("sort_order"))["m"]
        if max_order is None:
            max_order = 0
        validated_data.setdefault("sort_order", max_order + 1)
        return UserLibrary.objects.create(
            user=user,
            system_key="",
            is_default=False,
            **validated_data,
        )


class PublicUserLibrarySerializer(serializers.ModelSerializer):
    games_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = UserLibrary
        fields = ["id", "name", "color", "games_count", "sort_order"]
