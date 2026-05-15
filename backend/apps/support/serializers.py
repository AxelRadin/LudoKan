from rest_framework import serializers

from .models import SupportTicket


class SupportTicketCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ("id", "category", "subject", "body", "page_url", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")
        extra_kwargs = {"category": {"error_messages": {"invalid_choice": "Catégorie invalide."}}}

    def validate_subject(self, value: str) -> str:
        v = value.strip()
        if len(v) < 3:
            raise serializers.ValidationError("Le sujet doit contenir au moins 3 caractères.")
        return v

    def validate_body(self, value: str) -> str:
        v = value.strip()
        if len(v) < 10:
            raise serializers.ValidationError("Le message doit contenir au moins 10 caractères.")
        return v

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class SupportTicketUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ("id", "category", "subject", "status", "created_at", "updated_at")


class SupportTicketUserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "category",
            "subject",
            "body",
            "status",
            "page_url",
            "created_at",
            "updated_at",
        )


class SupportTicketAdminListSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_pseudo = serializers.CharField(source="user.pseudo", read_only=True, allow_null=True)
    assigned_to_email = serializers.EmailField(source="assigned_to.email", read_only=True, allow_null=True)

    class Meta:
        model = SupportTicket
        fields = (
            "id",
            "user",
            "user_email",
            "user_pseudo",
            "category",
            "subject",
            "body",
            "status",
            "page_url",
            "internal_note",
            "assigned_to",
            "assigned_to_email",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class SupportTicketAdminUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ("status", "internal_note", "assigned_to")
        extra_kwargs = {"status": {"error_messages": {"invalid_choice": "Statut invalide."}}}

    def validate_status(self, value: str) -> str:
        valid = {c.value for c in SupportTicket.Status}
        if value not in valid:
            raise serializers.ValidationError("Statut invalide.")
        return value
