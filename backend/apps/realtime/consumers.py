import json

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
