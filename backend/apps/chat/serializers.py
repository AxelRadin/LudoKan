from rest_framework import serializers

from apps.chat.models import Message


class MessageSerializer(serializers.ModelSerializer):
    """
    Sérialiseur REST d'un message de chat, aligné sur la
    représentation WebSocket (id, room_id, user_id, content,
    is_read, created_at).
    """

    room_id = serializers.IntegerField(source="room.id", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "room_id", "user_id", "content", "is_read", "created_at")
        read_only_fields = ("id", "room_id", "user_id", "is_read", "created_at")

    def validate_content(self, value: str) -> str:
        """
        Même règle que côté WebSocket : le contenu ne doit pas être vide
        (ni composé uniquement d'espaces).
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Le contenu du message ne peut pas être vide.")
        return value
