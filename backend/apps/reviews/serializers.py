from rest_framework import serializers

from apps.games.serializers import GameReadSerializer
from apps.reviews.models import Review
from apps.reviews.validators import validate_review_content_length
from apps.users.serializers import UserSerializer


class ReviewReadSerializer(serializers.ModelSerializer):
    """
    Serializer pour la lecture des reviews (GET).
    Inclut les details complets de l'utilisateur et du jeu.
    """

    user = UserSerializer(read_only=True)
    game = GameReadSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user", "game", "rating", "content", "date_created", "date_modified"]
        read_only_fields = ["id", "date_created", "date_modified"]


class ReviewWriteSerializer(serializers.ModelSerializer):
    """
    Serializer pour la creation/modification des reviews (POST/PUT/PATCH).
    L'utilisateur est automatiquement defini depuis la requete.
    """

    class Meta:
        model = Review
        fields = ["id", "game", "rating", "content"]
        read_only_fields = ["id"]

    def validate_content(self, value):
        """
        Validation du contenu : doit faire entre 4 et 500 caracteres.
        """
        validate_review_content_length(value)
        return value

    def create(self, validated_data):
        """
        Ajoute automatiquement l'utilisateur connecte lors de la creation.
        """
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)

    def validate(self, data):
        """
        Validation supplementaire : empeche la creation de doublons.
        """
        request = self.context.get("request")
        user = request.user if request else None
        game = data.get("game")

        # Lors de la creation (pas de self.instance), verifier l'unicite
        if not self.instance and user and game:
            if Review.objects.filter(user=user, game=game).exists():
                raise serializers.ValidationError("Vous avez deja laisse un avis pour ce jeu.")

        return data
