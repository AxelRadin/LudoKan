from django.urls import path

from apps.chat.consumers import ChatConsumer
from apps.realtime.consumers import PingAuthConsumer, PingConsumer

"""
Définit les routes WebSocket pour l'application.

Endpoints actuels :
- ws://<host>/ws/ping/        -> PingConsumer (test simple)
- ws://<host>/ws/ping-auth/   -> PingAuthConsumer (test auth)
- ws://<host>/ws/chat/<id>/   -> ChatConsumer (chat direct pour un salon donné)
"""

websocket_urlpatterns = [
    path("ws/ping/", PingConsumer.as_asgi()),
    path("ws/ping-auth/", PingAuthConsumer.as_asgi()),
    path("ws/chat/<int:room_id>/", ChatConsumer.as_asgi()),
]
