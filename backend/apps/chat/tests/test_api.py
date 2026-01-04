import pytest
from django.urls import reverse
from rest_framework import status

from apps.chat.models import ChatRoomUser, Message


@pytest.mark.django_db
def test_get_messages_requires_membership(api_client, user, chat_room):
    """
    Un utilisateur non membre du salon ne peut pas lister les messages.
    """

    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": chat_room.id})
    response = api_client.get(url)

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_get_messages_lists_paginated_results(api_client, user, chat_room, chat_other_user):
    """
    GET doit renvoyer une liste paginée des messages du salon,
    uniquement si l'utilisateur est membre.
    """

    ChatRoomUser.objects.create(room=chat_room, user=user)
    Message.objects.create(room=chat_room, user=user, content="Hello 1")
    Message.objects.create(room=chat_room, user=chat_other_user, content="Hello 2")

    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": chat_room.id})
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["count"] == 2
    assert len(body["results"]) == 2

    first = body["results"][0]
    assert first["content"] == "Hello 1"
    assert first["room_id"] == chat_room.id
    assert first["user_id"] == user.id


@pytest.mark.django_db
def test_get_messages_404_when_room_not_found(api_client, user):
    """
    Si le salon n'existe pas, on renvoie 404.
    """
    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": 999999})
    response = api_client.get(url)

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_post_message_creates_message_for_member(api_client, user, chat_room):
    """
    Un membre du salon peut créer un message via POST.
    """
    ChatRoomUser.objects.create(room=chat_room, user=user)
    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": chat_room.id})
    payload = {"content": "Hello HTTP"}
    response = api_client.post(url, payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert data["content"] == "Hello HTTP"
    assert data["room_id"] == chat_room.id
    assert data["user_id"] == user.id

    msg = Message.objects.get(room=chat_room, user=user, content="Hello HTTP")
    assert msg is not None


@pytest.mark.django_db
def test_post_message_forbidden_for_non_member(api_client, user, chat_room):
    """
    Un utilisateur non membre ne peut pas créer de message.
    """
    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": chat_room.id})
    response = api_client.post(url, {"content": "Hello"}, format="json")

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_post_message_rejects_empty_content(api_client, user, chat_room):
    """
    Le contenu vide (ou composé d'espaces) doit être rejeté,
    comme côté WebSocket.
    """
    ChatRoomUser.objects.create(room=chat_room, user=user)
    api_client.force_authenticate(user=user)

    url = reverse("chat-messages", kwargs={"room_id": chat_room.id})
    response = api_client.post(url, {"content": "   "}, format="json")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    body = response.json()
    assert "errors" in body
    assert "content" in body["errors"]
