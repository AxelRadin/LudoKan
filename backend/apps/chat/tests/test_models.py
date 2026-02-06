import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from apps.chat.models import ChatRoom, ChatRoomUser, Message, MessageRead

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
    et que les timestamps sont bien initialisés.
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
    assert message.created_at is not None
    assert message.updated_at is not None
    assert f"Message(id={message.id}, room_id={room.id}, user_id={user.id})" == str(message)


@pytest.mark.django_db
def test_messageread_links_message_and_user_and_defaults():
    """
    Vérifie qu'un MessageRead relie correctement un message et un user,
    et que read_at est bien initialisé.
    """
    user = User.objects.create_user(
        email="reader@example.com",
        pseudo="reader",
        password="pass1234",
    )
    room = ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)
    ChatRoomUser.objects.create(room=room, user=user)

    message = Message.objects.create(room=room, user=user, content="Hello")

    read = MessageRead.objects.create(message=message, user=user)

    assert read.message == message
    assert read.user == user
    assert read.read_at is not None
    assert f"MessageRead(message_id={message.id}, user_id={user.id})" == str(read)


@pytest.mark.django_db
def test_messageread_unique_per_user_per_message():
    """
    Vérifie que la contrainte d'unicité (message, user) est bien appliquée.
    """
    user = User.objects.create_user(
        email="reader2@example.com",
        pseudo="reader2",
        password="pass1234",
    )
    room = ChatRoom.objects.create(type=ChatRoom.TYPE_DIRECT)
    ChatRoomUser.objects.create(room=room, user=user)

    message = Message.objects.create(room=room, user=user, content="Hello")

    MessageRead.objects.create(message=message, user=user)

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            MessageRead.objects.create(message=message, user=user)


@pytest.mark.django_db
def test_messageread_supports_multiple_users_for_same_message():
    """
    Vérifie qu'un même message peut être marqué comme lu par plusieurs utilisateurs.
    """
    user1 = User.objects.create_user(
        email="reader3@example.com",
        pseudo="reader3",
        password="pass1234",
    )
    user2 = User.objects.create_user(
        email="reader4@example.com",
        pseudo="reader4",
        password="pass1234",
    )
    room = ChatRoom.objects.create(type=ChatRoom.TYPE_GROUP)
    ChatRoomUser.objects.create(room=room, user=user1)
    ChatRoomUser.objects.create(room=room, user=user2)

    message = Message.objects.create(room=room, user=user1, content="Group hello")

    MessageRead.objects.create(message=message, user=user1)
    MessageRead.objects.create(message=message, user=user2)

    readers = list(User.objects.filter(message_reads__message=message).order_by("id"))
    assert readers == [user1, user2]


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
