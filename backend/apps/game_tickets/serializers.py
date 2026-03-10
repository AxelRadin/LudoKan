from rest_framework import serializers

from apps.game_tickets.models import GameTicket, GameTicketAttachment, GameTicketComment, GameTicketHistory
from apps.games.models import Genre, Platform


class GameTicketHistorySerializer(serializers.ModelSerializer):
    actor_pseudo = serializers.CharField(source="actor.pseudo", read_only=True, allow_null=True)

    class Meta:
        model = GameTicketHistory
        fields = ["id", "old_state", "new_state", "actor_pseudo", "comment", "created_at"]
        read_only_fields = fields


class GameTicketCommentSerializer(serializers.ModelSerializer):
    author_pseudo = serializers.CharField(source="author.pseudo", read_only=True, allow_null=True)

    class Meta:
        model = GameTicketComment
        fields = ["id", "author_pseudo", "comment", "created_at"]
        read_only_fields = ["id", "author_pseudo", "created_at"]


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

    def validate_game_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Game name is too short.")
        return value

    def validate_year(self, value):
        if value is not None and (value < 1970 or value > 2100):
            raise serializers.ValidationError("Year must be between 1970 and 2100.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        game_name = attrs.get("game_name")

        exists = GameTicket.objects.filter(
            user=user,
            game_name__iexact=game_name,
            status=GameTicket.Status.PENDING,
        ).exists()

        if exists:
            raise serializers.ValidationError("You already have a pending ticket for this game.")

        return attrs


class GameTicketListSerializer(serializers.ModelSerializer):
    reviewer_email = serializers.EmailField(source="reviewer.email", read_only=True, allow_null=True)

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
            "status",
            "genres",
            "platforms",
            "rejection_reason",
            "reviewer_email",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]


class AdminGameTicketListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_pseudo = serializers.CharField(source="user.pseudo", read_only=True)
    reviewer_email = serializers.EmailField(source="reviewer.email", read_only=True, allow_null=True)

    class Meta:
        model = GameTicket
        fields = [
            "id",
            "user",
            "user_email",
            "user_pseudo",
            "game_name",
            "description",
            "publisher",
            "year",
            "players",
            "age",
            "status",
            "genres",
            "platforms",
            "rejection_reason",
            "reviewer_email",
            "reviewed_at",
            "internal_comment",
            "internal_note",
            "admin_metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


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
    """For FSM transitions - only updates metadata, not status directly."""

    rejection_reason = serializers.CharField(required=False, allow_blank=False, help_text="Required only for 'reject' action")
    internal_comment = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        action = self.context.get("action")
        if action == "reject" and not attrs.get("rejection_reason"):
            raise serializers.ValidationError({"rejection_reason": "This field is required when rejecting a ticket."})
        return attrs


class AdminGameTicketUpdateSerializer(serializers.ModelSerializer):
    """For updating metadata fields only - NOT status."""

    class Meta:
        model = GameTicket
        fields = [
            "internal_comment",
            "internal_note",
            "admin_metadata",
        ]

    def validate(self, attrs):
        if "status" in self.initial_data:
            raise serializers.ValidationError({"status": "Status cannot be modified via this endpoint. Use FSM transitions."})
        return attrs

    def update(self, instance, validated_data):
        validated_data.pop("status", None)
        return super().update(instance, validated_data)
