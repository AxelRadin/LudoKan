import pytest
from django.contrib.auth import get_user_model

from apps.chat.models import ChatRoom, ChatRoomUser

User = get_user_model()


@pytest.fixture
def chat_room(db):
    """
    Salon de chat direct basique utilisé dans les tests.
    """
    return ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)


@pytest.fixture
def chat_other_user(db):
    """
    Deuxième utilisateur de chat, pour les scénarios à 2 membres.
    """
    return User.objects.create_user(
        email="other@example.com",
        pseudo="other",
        password="pass1234",
    )


@pytest.fixture
def chat_room_with_user(chat_room, user):
    """
    Salon de chat avec l'utilisateur principal déjà membre.
    """
    ChatRoomUser.objects.create(room=chat_room, user=user)
    return chat_room


@pytest.fixture
def chat_room_with_two_members(chat_room, user, chat_other_user):
    """
    Salon de chat avec les deux utilisateurs déjà membres.
    """
    ChatRoomUser.objects.create(room=chat_room, user=user)
    ChatRoomUser.objects.create(room=chat_room, user=chat_other_user)
    return chat_room
