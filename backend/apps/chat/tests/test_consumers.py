import json

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.test import override_settings

from apps.chat.consumers import ChatConsumer
from apps.chat.models import Message


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_rejects_anonymous_user(chat_room):
    """
    Comme la porte d'une salle fermée : si tu n'as pas d'identité,
    on ne te laisse pas entrer.
    """
    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = AnonymousUser()
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is False
    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_rejects_non_member(user, chat_room):
    """
    Si l'utilisateur n'est pas membre de la salle (pas de chaise à son nom),
    la connexion est refusée.
    """
    # On n'ajoute PAS user comme membre de cette room

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is False
    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_accepts_member(user, chat_room_with_user):
    """
    Un utilisateur membre de la salle peut ouvrir la porte et entrer.
    """
    chat_room = chat_room_with_user

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is True

    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_persists_and_broadcasts_messages(user, chat_room_with_two_members, chat_other_user):
    """
    Scénario complet :
    - Deux utilisateurs sont assis dans la même salle.
    - L'un envoie un message.
    - Le message est enregistré en base (journal de la salle).
    - Les deux reçoivent le message via WebSocket.
    """
    # Préparation : salle + deux membres (fixture)
    chat_room = chat_room_with_two_members

    application = ChatConsumer.as_asgi()

    # Deux sockets connectés au même salon
    communicator1 = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator1.scope["user"] = user
    communicator1.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    communicator2 = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator2.scope["user"] = chat_other_user
    communicator2.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected1, _ = await communicator1.connect()
    connected2, _ = await communicator2.connect()
    assert connected1 is True
    assert connected2 is True

    # Aucun message n'est envoyé à la connexion, on peut donc
    # directement envoyer notre payload.
    payload = {"type": "message", "content": "Hello world"}
    await communicator1.send_to(text_data=json.dumps(payload))

    # Les deux participants doivent recevoir le message
    raw1 = await communicator1.receive_from()
    raw2 = await communicator2.receive_from()

    data1 = json.loads(raw1)
    data2 = json.loads(raw2)

    assert data1["content"] == "Hello world"
    assert data2["content"] == "Hello world"
    assert data1["room_id"] == chat_room.id
    assert data2["room_id"] == chat_room.id
    assert data1["user_id"] == user.id
    assert data2["user_id"] == user.id

    # Vérifier la persistance en base : un unique Message doit exister
    messages = await sync_to_async(list)(Message.objects.filter(room=chat_room, user=user, content="Hello world"))
    assert len(messages) == 1

    await communicator1.disconnect()
    await communicator2.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_rejects_when_room_id_missing(user, chat_room_with_user):
    """
    Si l'URL n'inclut pas de room_id exploitable, la connexion est rejetée (code 4400).
    """
    chat_room = chat_room_with_user
    assert chat_room is not None

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/chat/")  # pas de room_id dans l'URL
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {}}  # room_id manquant

    connected, _ = await communicator.connect()

    assert connected is False
    await communicator.disconnect()


@pytest.mark.anyio
async def test_chat_consumer_receive_empty_text_is_ignored():
    """
    Couvrir la branche où text_data est falsy sans passer par WebsocketCommunicator.
    """
    consumer = ChatConsumer()
    # Aucun de ces appels ne doit lever d'exception
    await consumer.receive(text_data=None)
    await consumer.receive(text_data="")


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_invalid_json_returns_error(user, chat_room_with_user):
    """
    Un payload non-JSON doit renvoyer une erreur 'invalid_json'.
    """
    chat_room = chat_room_with_user

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is True

    await communicator.send_to(text_data="not a json")
    raw = await communicator.receive_from()
    data = json.loads(raw)
    assert data["type"] == "error"
    assert data["code"] == "invalid_json"

    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_unsupported_type_returns_error(user, chat_room_with_user):
    """
    Un type de message non supporté doit renvoyer 'unsupported_type'.
    """
    chat_room = chat_room_with_user

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is True

    await communicator.send_to(text_data=json.dumps({"type": "ping", "content": "x"}))
    raw = await communicator.receive_from()
    data = json.loads(raw)
    assert data["type"] == "error"
    assert data["code"] == "unsupported_type"

    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db(transaction=True)
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_chat_consumer_empty_content_returns_error(user, chat_room_with_user):
    """
    Un message de type 'message' avec un contenu vide doit renvoyer 'empty_content'.
    """
    chat_room = chat_room_with_user

    application = ChatConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, f"/ws/chat/{chat_room.id}/")
    communicator.scope["user"] = user
    communicator.scope["url_route"] = {"kwargs": {"room_id": chat_room.id}}

    connected, _ = await communicator.connect()
    assert connected is True

    await communicator.send_to(text_data=json.dumps({"type": "message", "content": "   "}))
    raw = await communicator.receive_from()
    data = json.loads(raw)
    assert data["type"] == "error"
    assert data["code"] == "empty_content"

    await communicator.disconnect()
