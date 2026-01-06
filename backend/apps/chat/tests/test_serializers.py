import pytest
from django.contrib.auth import get_user_model

from apps.chat.models import Message
from apps.chat.serializers import MessageSerializer

User = get_user_model()


@pytest.mark.django_db
def test_message_serializer_serializes_instance(user, chat_room):
    """
    Vérifie que le serializer expose les mêmes champs que le WebSocket :
    id, room_id, user_id, content, created_at.
    """
    message = Message.objects.create(room=chat_room, user=user, content="Hello serializer")

    serializer = MessageSerializer(instance=message)
    data = serializer.data

    assert data["id"] == message.id
    assert data["room_id"] == chat_room.id
    assert data["user_id"] == user.id
    assert data["content"] == "Hello serializer"
    assert data["created_at"] is not None


@pytest.mark.django_db
def test_message_serializer_accepts_non_empty_content(chat_room, user):
    """
    Le serializer doit accepter un contenu non vide.
    Django REST Framework trim automatiquement les espaces en début/fin,
    donc la valeur validée est normalisée.
    """
    serializer = MessageSerializer(data={"content": "  Hello  "})

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["content"] == "Hello"


@pytest.mark.django_db
@pytest.mark.parametrize("content", ["", "   ", None])
def test_message_serializer_rejects_empty_content(chat_room, user, content):
    """
    Le serializer doit rejeter les contenus vides ou composés uniquement d'espaces,
    comme la logique du consumer WebSocket.
    """
    serializer = MessageSerializer(data={"content": content})

    assert not serializer.is_valid()
    assert "content" in serializer.errors
