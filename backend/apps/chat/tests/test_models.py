import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from apps.chat.models import ChatRoom, ChatRoomUser, Message

User = get_user_model()


@pytest.mark.django_db
def test_create_direct_chatroom_with_two_members():
    """
    Vérifie qu'on peut créer un ChatRoom de type 'direct'
    et lui associer deux utilisateurs via ChatRoomUser.
    """
    user1 = User.objects.create_user(
        email="user1@example.com",
        pseudo="user1",
        password="pass1234",
    )
    user2 = User.objects.create_user(
        email="user2@example.com",
        pseudo="user2",
        password="pass1234",
    )

    room = ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)

    ChatRoomUser.objects.create(room=room, user=user1)
    ChatRoomUser.objects.create(room=room, user=user2)

    assert room.type == ChatRoom.TYPE_DIRECT
    members = list(room.members.order_by("id"))
    assert members == [user1, user2]
    assert f"ChatRoom(id={room.id}, type={room.type})" == str(room)


@pytest.mark.django_db
def test_message_links_user_and_room_and_defaults():
    """
    Vérifie qu'un Message est correctement lié à un user + room
    et que les champs par défaut (is_read, timestamps) sont bien initialisés.
    """
    user = User.objects.create_user(
        email="chatuser@example.com",
        pseudo="chatuser",
        password="pass1234",
    )
    room = ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)
    ChatRoomUser.objects.create(room=room, user=user)

    message = Message.objects.create(
        room=room,
        user=user,
        content="Hello",
    )

    assert message.room == room
    assert message.user == user
    assert message.content == "Hello"
    assert message.is_read is False
    assert message.created_at is not None
    assert message.updated_at is not None
    assert f"Message(id={message.id}, room_id={room.id}, user_id={user.id})" == str(message)


@pytest.mark.django_db
def test_chatroomuser_unique_constraint():
    """
    Vérifie que la contrainte d'unicité (room, user) est bien appliquée.
    """
    user = User.objects.create_user(
        email="uniq@example.com",
        pseudo="uniq",
        password="pass1234",
    )
    room = ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)

    membership = ChatRoomUser.objects.create(room=room, user=user)

    assert f"ChatRoomUser(room_id={room.id}, user_id={user.id})" == str(membership)
    with pytest.raises(IntegrityError):
        with transaction.atomic():
            ChatRoomUser.objects.create(room=room, user=user)
