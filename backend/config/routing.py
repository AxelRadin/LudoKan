from django.urls import path

from apps.realtime.consumers import PingAuthConsumer, PingConsumer

"""
Définit les routes WebSocket pour l'application.

Pour le moment, on expose uniquement un endpoint de test :
- ws://<host>/ws/ping/  -> PingConsumer
"""

websocket_urlpatterns = [
    path("ws/ping/", PingConsumer.as_asgi()),
    path("ws/ping-auth/", PingAuthConsumer.as_asgi()),
]
