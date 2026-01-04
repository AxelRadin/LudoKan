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
