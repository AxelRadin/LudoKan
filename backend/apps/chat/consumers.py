import json
from typing import Any, Dict, Optional

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.exceptions import ObjectDoesNotExist

from apps.chat.models import ChatRoom, Message


@database_sync_to_async
def _get_room_for_user(room_id: int, user) -> Optional[ChatRoom]:
    """
    Retourne le ChatRoom si l'utilisateur en est membre, sinon None.

    On fait cette vérification côté base pour être sûr que:
    - le salon existe
    - le user fait bien partie des membres (ChatRoomUser).
    """
    try:
        return ChatRoom.objects.filter(id=room_id, memberships__user=user).get()
    except (ChatRoom.DoesNotExist, ObjectDoesNotExist):
        return None


@database_sync_to_async
def _create_message(room: ChatRoom, user, content: str) -> Message:
    """
    Crée et retourne un Message en base de données.
    """
    return Message.objects.create(room=room, user=user, content=content)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Consumer Channels pour un chat direct entre deux utilisateurs.
    """

    async def connect(self):
        """
        Authentification (JWT via JwtAuthMiddleware) + Vérification salon + appartenance utilisateur + Ajout du socket au groupe Channels
        """
        self.user = self.scope.get("user")
        if not self.user or getattr(self.user, "is_anonymous", True):
            await self.close(code=4401)  # Unauthorized
            return

        # room_id vient du pattern d'URL: ws/chat/<room_id>/
        room_id = self.scope.get("url_route", {}).get("kwargs", {}).get("room_id")
        if room_id is None:
            await self.close(code=4400)  # Bad request
            return

        # Vérifier que la room existe et que l'utilisateur en est membre.
        room = await _get_room_for_user(room_id=room_id, user=self.user)
        if room is None:
            await self.close(code=4403)
            return

        self.room = room
        self.room_group_name = f"chat_room_{self.room.id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()

    async def receive(self, text_data: Optional[str] = None, bytes_data: Optional[bytes] = None):
        """
        Réception d'un message depuis le client.
        """
        if not text_data:
            return

        try:
            data: Dict[str, Any] = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "code": "invalid_json",
                        "detail": "Le message doit être un JSON valide.",
                    }
                )
            )
            return

        if data.get("type") != "message":
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "code": "unsupported_type",
                        "detail": "Seul le type 'message' est supporté.",
                    }
                )
            )
            return

        content = (data.get("content") or "").strip()
        if not content:
            await self.send(
                text_data=json.dumps(
                    {
                        "type": "error",
                        "code": "empty_content",
                        "detail": "Le contenu du message ne peut pas être vide.",
                    }
                )
            )
            return

        # Sauvegarder le message en base: c'est notre "journal" persistant.
        message = await _create_message(room=self.room, user=self.user, content=content)

        # Construire la charge utile à broadcaster.
        event_payload = {
            "type": "chat_message",  # nom de la méthode handler ci-dessous
            "message": {
                "id": message.id,
                "room_id": self.room.id,
                "user_id": self.user.id,
                "content": message.content,
                "created_at": message.created_at.isoformat().replace("+00:00", "Z"),
            },
        }

        # Envoyer l'événement à tous les membres connectés au groupe.
        await self.channel_layer.group_send(self.room_group_name, event_payload)

    async def chat_message(self, event: Dict[str, Any]):
        """
        Handler appelé pour chaque événement de type "chat_message"
        envoyé via group_send.
        """
        await self.send(text_data=json.dumps(event["message"]))

    async def disconnect(self, close_code: int):
        """
        Retrait du socket du groupe Channels
        """

        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
