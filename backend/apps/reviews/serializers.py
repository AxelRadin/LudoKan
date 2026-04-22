from rest_framework import serializers

from apps.games.models import Rating
from apps.games.serializers import GameReadSerializer
from apps.reviews.models import ContentReport, Review
from apps.reviews.validators import validate_review_content_length
from apps.users.serializers import UserSerializer


class RatingValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ["value"]


class ReviewReadSerializer(serializers.ModelSerializer):
    """
    Serializer pour la lecture des reviews (GET).
    Inclut les details complets de l'utilisateur et du jeu.
    """

    user = UserSerializer(read_only=True)
    game = GameReadSerializer(read_only=True)
    rating = RatingValueSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "game", "rating", "title", "content", "date_created", "date_modified"]
        read_only_fields = ["id", "date_created", "date_modified"]


class ReviewWriteSerializer(serializers.ModelSerializer):
    """
    Serializer pour la creation/modification des reviews (POST/PUT/PATCH).
    L'utilisateur est automatiquement defini depuis la requete.
    """

    rating_value = serializers.IntegerField(required=False, min_value=1, max_value=5, write_only=True)
    content = serializers.CharField(required=False, allow_blank=True, default="")
    title = serializers.CharField(required=False, allow_blank=True, default="", max_length=25)

    class Meta:
        model = Review
        fields = ["id", "game", "rating_value", "title", "content"]
        read_only_fields = ["id"]

    def validate_content(self, value):
        """
        Validation du contenu : doit faire entre 4 et 500 caracteres si fourni.
        """
        validate_review_content_length(value)
        return value

    def validate(self, data):
        """
        Validation supplementaire : empeche la creation de doublons.
        Exige au moins une note ou un contenu.
        """
        request = self.context.get("request")
        user = request.user if request else None
        game = data.get("game")

        if not self.instance and user and game:
            if Review.objects.filter(user=user, game=game).exists():
                raise serializers.ValidationError("Vous avez deja laisse un avis pour ce jeu.")

        rating_value = data.get("rating_value")
        content = data.get("content", "")
        if not rating_value and not content:
            raise serializers.ValidationError("Veuillez fournir une note ou un avis.")

        return data

    def create(self, validated_data):
        """
        Ajoute automatiquement l'utilisateur connecte lors de la creation.
        Cree ou met a jour le Rating associe si rating_value est fourni.
        """
        rating_value = validated_data.pop("rating_value", None)
        user = self.context["request"].user
        validated_data["user"] = user

        if rating_value is not None:
            game = validated_data["game"]
            rating, _ = Rating.objects.update_or_create(
                user=user,
                game=game,
                defaults={
                    "value": rating_value,
                    "rating_type": Rating.RATING_TYPE_ETOILES,
                    "normalized_value": rating_value * 2,
                },
            )
            validated_data["rating"] = rating

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Met a jour le Rating associe si rating_value est fourni.
        """
        rating_value = validated_data.pop("rating_value", None)

        if rating_value is not None and instance.rating is not None:
            instance.rating.value = rating_value
            instance.rating.normalized_value = rating_value * 2
            instance.rating.save(update_fields=["value", "normalized_value"])
        elif rating_value is not None:
            user = self.context["request"].user
            game = instance.game
            rating, _ = Rating.objects.update_or_create(
                user=user,
                game=game,
                defaults={
                    "value": rating_value,
                    "rating_type": Rating.RATING_TYPE_ETOILES,
                    "normalized_value": rating_value * 2,
                },
            )
            instance.rating = rating

        return super().update(instance, validated_data)


class ContentReportCreateSerializer(serializers.ModelSerializer):
    """Serializer minimal pour créer un signalement."""

    class Meta:
        model = ContentReport
        fields = ["reason"]


class ContentReportAdminSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)

    class Meta:
        model = ContentReport
        fields = [
            "id",
            "reporter",
            "target_type",
            "target_id",
            "reason",
            "handled",
            "handled_by",
            "handled_at",
            "created_at",
        ]
