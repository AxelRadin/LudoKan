import json

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.test import override_settings

from apps.realtime.consumers import PingAuthConsumer, PingConsumer


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_ping_consumer_connect_and_ping():
    """
    Vérifie que PingConsumer :
    - accepte la connexion,
    - envoie un message 'connected',
    - répond 'pong' à un message de type 'ping',
    - renvoie un echo pour un autre payload.
    """
    application = PingConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/ping/")

    connected, _ = await communicator.connect()
    assert connected is True

    # Message initial de bienvenue
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data == {"type": "pong", "message": "connected"}

    # Test du ping/pong
    await communicator.send_to(text_data=json.dumps({"type": "ping"}))
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data == {"type": "pong"}

    # Test du echo avec un payload arbitraire
    payload = {"foo": "bar"}
    await communicator.send_to(text_data=json.dumps(payload))
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "echo"
    assert data["data"] == payload

    await communicator.disconnect()


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_ping_consumer_receive_raw_text():
    """
    Vérifie que PingConsumer gère un texte non-JSON
    en renvoyant un echo avec la clé 'raw'.
    """
    application = PingConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/ping/")

    connected, _ = await communicator.connect()
    assert connected is True

    # Consommer le message de bienvenue pour ne pas polluer le test
    await communicator.receive_from()

    await communicator.send_to(text_data="juste du texte")
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "echo"
    assert data["data"] == {"raw": "juste du texte"}

    await communicator.disconnect()


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_ping_auth_consumer_refuse_anonymous():
    """
    Vérifie que PingAuthConsumer refuse la connexion
    pour un utilisateur anonyme.
    """
    anonymous = AnonymousUser()
    application = PingAuthConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/ping-auth/")
    # Simuler l'utilisateur dans le scope, comme le ferait le middleware JWT
    communicator.scope["user"] = anonymous

    connected, _ = await communicator.connect()
    # La connexion doit être immédiatement refusée
    assert connected is False

    await communicator.disconnect()


@pytest.mark.anyio
@pytest.mark.django_db
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_ping_auth_consumer_accepts_authenticated_user(user):
    """
    Vérifie que PingAuthConsumer accepte un utilisateur authentifié
    et répond correctement.
    """
    application = PingAuthConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/ping-auth/")
    # Simuler l'utilisateur authentifié dans le scope
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert connected is True

    # Message initial de bienvenue
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data == {"type": "pong", "message": "auth-connected"}

    # Test de l'echo
    await communicator.send_to(text_data="hello")
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "echo-auth"
    assert data["data"] == "hello"

    await communicator.disconnect()
