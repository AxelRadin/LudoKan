from rest_framework import serializers

from apps.game_tickets.models import GameTicket
from apps.games.models import Genre, Platform


class GameTicketCreateSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    genres = serializers.PrimaryKeyRelatedField(
        queryset=Genre.objects.all(),
        many=True,
        required=False,
    )

    platforms = serializers.PrimaryKeyRelatedField(
        queryset=Platform.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = GameTicket
        fields = [
            "id",
            "user",
            "game_name",
            "description",
            "publisher",
            "year",
            "players",
            "age",
            "genres",
            "platforms",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "created_at",
        ]

    # ------------------
    # VALIDATIONS
    # ------------------

    def validate_game_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Game name is too short.")
        return value

    def validate_year(self, value):
        if value is not None and (value < 1970 or value > 2100):
            raise serializers.ValidationError("Year must be between 1970 and 2100.")
        return value

    def validate_age(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Age must be positive.")
        return value

    def validate(self, attrs):
        """
        Validation métier globale (doublon optionnel).
        """
        user = self.context["request"].user
        game_name = attrs.get("game_name")

        # Optionnel : éviter le spam de tickets identiques
        exists = GameTicket.objects.filter(
            user=user,
            game_name__iexact=game_name,
            status=GameTicket.Status.PENDING,
        ).exists()

        if exists:
            raise serializers.ValidationError("You already have a pending ticket for this game.")

        return attrs
