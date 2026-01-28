from rest_framework import serializers

from apps.game_tickets.models import GameTicket, GameTicketAttachment
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


class GameTicketListSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameTicket
        fields = [
            "id",
            "game_name",
            "description",
            "publisher",
            "year",
            "players",
            "age",
            "status",
            "genres",
            "platforms",
            "created_at",
            "updated_at",
        ]


class GameTicketAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameTicketAttachment
        fields = ["id", "file", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_file(self, file):
        max_size = 5 * 1024 * 1024  # 5 MB
        allowed_types = ["image/png", "image/jpeg", "image/webp"]

        if file.size > max_size:
            raise serializers.ValidationError("File too large (max 5MB).")

        if file.content_type not in allowed_types:
            raise serializers.ValidationError("Unsupported file format.")

        return file


class GameTicketStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=GameTicket.Status.choices)
