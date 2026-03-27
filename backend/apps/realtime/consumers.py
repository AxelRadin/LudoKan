import json
from typing import Any, Dict, Optional

from channels.generic.websocket import AsyncWebsocketConsumer


class PingConsumer(AsyncWebsocketConsumer):
    """
    Consumer de test très simple pour valider l'infra WebSocket.

    - À la connexion, envoie un message "pong" de bienvenue.
    - Quand il reçoit un message avec {"type": "ping"}, renvoie {"type": "pong"}.
    - Pour tout autre payload, renvoie un "echo".
    """

    async def connect(self):
        """
        Appelée quand un client ouvre une connexion WebSocket.
        """
        # Ici on pourrait déjà vérifier self.scope["user"] (auth JWT).
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "pong",
                    "message": "connected",
                }
            )
        )

    async def receive(self, text_data=None, bytes_data=None):
        """
        Appelée à chaque message reçu via le WebSocket.
        """
        if text_data:
            try:
                data = json.loads(text_data)
            except json.JSONDecodeError:
                data = {"raw": text_data}

            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
            else:
                await self.send(text_data=json.dumps({"type": "echo", "data": data}))

    async def disconnect(self, close_code):
        """
        Appelée quand la connexion WebSocket est fermée.
        """
        # Pour le moment, rien de particulier à faire.
        pass


class PingAuthConsumer(AsyncWebsocketConsumer):
    """
    Version protégée: nécessite un user authentifié (via JWT).
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or getattr(user, "is_anonymous", True):
            await self.close(code=4401)
            return

        await self.accept()
        await self.send(text_data=json.dumps({"type": "pong", "message": "auth-connected"}))

    async def receive(self, text_data=None, bytes_data=None):
        await self.send(text_data=json.dumps({"type": "echo-auth", "data": text_data}))


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    Consumer WebSocket pour les notifications utilisateur en temps réel.
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or getattr(user, "is_anonymous", True):
            # Token manquant / invalide -> on ferme la connexion.
            await self.close(code=4401)
            return

        self.user = user
        self.group_name = f"user_notifications_{self.user.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def receive(self, text_data: Optional[str] = None, bytes_data: Optional[bytes] = None):
        """
        Support minimal de ping/pong pour permettre aux clients
        de vérifier la connexion.
        """
        if not text_data:
            return

        try:
            data: Dict[str, Any] = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get("type") == "ping":
            await self.send(text_data=json.dumps({"type": "pong"}))

    async def notification_message(self, event: Dict[str, Any]):
        """
        Handler appelé lorsqu'un événement est envoyé sur le groupe
        user_notifications_<user_id>.

        Le signal envoie un payload sous la forme :
        {
            "type": "notification_message",
            "notification": { ...serializer data... }
        }
        """
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "notification": event["notification"],
                }
            )
        )

    async def disconnect(self, close_code: int):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
