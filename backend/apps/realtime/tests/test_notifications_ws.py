import json

import pytest
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import AnonymousUser
from django.test import override_settings
from notifications.signals import notify

from apps.realtime import signals as realtime_signals
from apps.realtime.consumers import NotificationConsumer


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_notification_consumer_refuses_anonymous():
    """
    Vérifie que NotificationConsumer refuse un utilisateur anonyme.
    """
    application = NotificationConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/notifications/")
    communicator.scope["user"] = AnonymousUser()

    connected, _ = await communicator.connect()
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
async def test_notification_consumer_receives_group_message(user):
    """
    Vérifie qu'un utilisateur authentifié rejoint bien le groupe
    user_notifications_<user_id> et reçoit un message envoyé sur ce groupe.
    """
    application = NotificationConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/notifications/")
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert connected is True

    channel_layer = get_channel_layer()
    group_name = f"user_notifications_{user.id}"
    notification_payload = {
        "id": 123,
        "verb": "test-verb",
        "type": "test-verb",
        "actor": None,
        "target": None,
        "extra": {},
        "timestamp": "2025-01-01T00:00:00Z",
        "unread": True,
    }

    await channel_layer.group_send(
        group_name,
        {
            "type": "notification_message",
            "notification": notification_payload,
        },
    )

    response = await communicator.receive_from()
    data = json.loads(response)

    assert data["type"] == "notification"
    assert data["notification"]["verb"] == "test-verb"
    assert data["notification"]["unread"] is True

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
async def test_notification_consumer_ping_pong(user):
    """
    Vérifie le comportement ping/pong de NotificationConsumer.
    """
    application = NotificationConsumer.as_asgi()
    communicator = WebsocketCommunicator(application, "/ws/notifications/")
    communicator.scope["user"] = user

    connected, _ = await communicator.connect()
    assert connected is True

    await communicator.send_to(text_data=json.dumps({"type": "ping"}))
    response = await communicator.receive_from()
    data = json.loads(response)

    assert data == {"type": "pong"}

    await communicator.disconnect()


@pytest.mark.django_db
def test_signal_push_notification_via_websocket(monkeypatch, user):
    """
    Vérifie que le signal push_notification_via_websocket envoie bien
    un événement sur le bon groupe avec un format cohérent.
    """

    class DummyChannelLayer:
        def __init__(self):
            self.calls = []

        async def group_send(self, group, message):
            self.calls.append((group, message))

    dummy_layer = DummyChannelLayer()

    monkeypatch.setattr(
        realtime_signals,
        "get_channel_layer",
        lambda: dummy_layer,
    )

    # Création d'une vraie Notification en base via le signal notify
    notify.send(
        user,
        recipient=user,
        verb="signal-test",
        description="Test signal",
    )

    # Le signal est déjà connecté via apps.RealtimeConfig.ready
    assert len(dummy_layer.calls) == 1

    group, message = dummy_layer.calls[0]
    assert group == f"user_notifications_{user.id}"
    assert message["type"] == "notification_message"
    assert message["notification"]["verb"] == "signal-test"
    assert message["notification"]["unread"] is True
