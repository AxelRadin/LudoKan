from rest_framework import serializers

from apps.games.models import Game, GameScreenshot, GameVideo, Genre, Platform, Publisher, Rating
from apps.library.models import UserGame
from apps.library.serializers import GenreSerializer, PlatformSerializer, PublisherSerializer


class GameScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameScreenshot
        fields = ["url"]


class GameVideoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="igdb_id")

    class Meta:
        model = GameVideo
        fields = ["id", "name", "video_id"]


class GameReadSerializer(serializers.ModelSerializer):
    django_id = serializers.ReadOnlyField(source="id")
    summary = serializers.ReadOnlyField(source="description")
    name = serializers.SerializerMethodField()
    publisher = PublisherSerializer()
    genres = GenreSerializer(many=True)
    platforms = PlatformSerializer(many=True)
    collections = serializers.ReadOnlyField(default=[])
    franchises = serializers.ReadOnlyField(default=[])
    user_library = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()
    screenshots = GameScreenshotSerializer(many=True, read_only=True)
    videos = GameVideoSerializer(many=True, read_only=True, source="game_videos")

    class Meta:
        model = Game
        fields = [
            "id",
            "django_id",
            "igdb_id",
            "name",
            "summary",
            "cover_url",
            "release_date",
            "platforms",
            "genres",
            "collections",
            "franchises",
            "publisher",
            "user_library",
            "user_rating",
            "status",
            "min_players",
            "max_players",
            "min_age",
            "rating_avg",
            "average_rating",
            "rating_count",
            "popularity_score",
            "screenshots",
            "videos",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def get_name(self, obj: Game) -> str:
        """Retourne name_fr en priorité, sinon name."""
        return obj.name_fr or obj.name or "Unknown"

    def _get_request_user(self):
        request = self.context.get("request")
        if request is None:
            return None
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        return user

    def get_user_library(self, obj: Game):
        user = self._get_request_user()
        if user is None:
            return None

        # On essaie d'abord via l'attribut pré-chargé (prefetch_related)
        user_games = getattr(obj, "prefetched_user_games", None)
        if user_games is not None:
            user_game = next((ug for ug in user_games if ug.user_id == user.id), None)
        else:
            user_game = UserGame.objects.filter(user=user, game=obj).first()

        if user_game is None:
            return None

        return {
            "status": user_game.status,
            "is_favorite": user_game.is_favorite,
        }

    def get_user_rating(self, obj: Game):
        user = self._get_request_user()
        if user is None:
            return None

        # On essaie d'abord via l'attribut pré-chargé (prefetch_related)
        user_ratings = getattr(obj, "prefetched_user_ratings", None)
        if user_ratings is not None:
            rating = next((r for r in user_ratings if r.user_id == user.id), None)
        else:
            rating = Rating.objects.filter(user=user, game=obj).first()

        if rating is None:
            return None

        return {
            "value": float(rating.value),
            "rating_type": rating.rating_type,
        }


class GameDetailSerializer(GameReadSerializer):
    """
    Désormais identique à GameReadSerializer pour l'unification,
    mais conservé pour compatibilité avec le code existant qui y fait référence.
    """

    pass


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
            "name",
            "description",
        ]


class PlatformCRUDSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = [
            "id",
            "igdb_id",
            "name",
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
        rating_model = self.Meta.model

        rating_type = attrs.get("rating_type") or getattr(self.instance, "rating_type", None)
        value = attrs.get("value") or getattr(self.instance, "value", None)

        # Let the model handle value/range validation
        tmp = rating_model(
            rating_type=rating_type,
            value=value,
        )
        tmp.clean()

        return attrs


class IgdbResolveSerializer(serializers.Serializer):
    igdb_id = serializers.IntegerField(required=True)
    name = serializers.CharField(required=False, allow_blank=True)
    cover_url = serializers.URLField(required=False, allow_null=True)
    release_date = serializers.DateField(required=False, allow_null=True)
    summary = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    platforms = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    genres = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    screenshots = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    videos = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
