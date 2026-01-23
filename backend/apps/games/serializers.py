from rest_framework import serializers

from apps.games.models import Game, Genre, Platform, Publisher, Rating
from apps.library.models import UserGame
from apps.library.serializers import GenreSerializer, PlatformSerializer, PublisherSerializer


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


class GameDetailSerializer(GameReadSerializer):
    """
    Serializer pour le détail d'un jeu.

    Ajoute les informations personnalisées pour l'utilisateur authentifié :
    - son entrée de bibliothèque (status, is_favorite)
    - sa note (rating) pour ce jeu
    """

    user_library = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()

    class Meta(GameReadSerializer.Meta):
        fields = GameReadSerializer.Meta.fields + [
            "user_library",
            "user_rating",
        ]

    def _get_request_user(self):
        request = self.context.get("request")
        if request is None:
            return None
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return None
        return user

    def get_user_library(self, obj: Game):
        """
        Retourne les infos de bibliothèque de l'utilisateur pour ce jeu :
        {
            "status": "EN_COURS" | "TERMINE" | "ABANDONNE" | "ENVIE_DE_JOUER",
            "is_favorite": bool
        }
        ou None si l'utilisateur n'est pas authentifié ou n'a pas ajouté le jeu.
        """
        user = self._get_request_user()
        if user is None:
            return None

        try:
            user_game = UserGame.objects.get(user=user, game=obj)
        except UserGame.DoesNotExist:
            return None

        return {
            "status": user_game.status,
            "is_favorite": user_game.is_favorite,
        }

    def get_user_rating(self, obj: Game):
        """
        Retourne la note de l'utilisateur pour ce jeu :
        {
            "value": float,
            "rating_type": str
        }
        ou None si aucune note ou utilisateur non authentifié.
        """
        user = self._get_request_user()
        if user is None:
            return None

        rating = Rating.objects.filter(user=user, game=obj).first()
        if rating is None:
            return None

        return {
            "value": float(rating.value),
            "rating_type": rating.rating_type,
        }


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
