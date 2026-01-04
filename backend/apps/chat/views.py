from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.chat.models import ChatRoom, ChatRoomUser, Message
from apps.chat.serializers import MessageSerializer


class ChatMessageListCreateView(generics.ListCreateAPIView):
    """
    Vue REST pour lister et créer des messages dans un salon de chat.

    - GET /api/chats/<room_id>/messages      -> liste paginée des messages
    - POST /api/chats/<room_id>/messages     -> création d'un message

    L'utilisateur doit être membre du salon (ChatRoomUser) pour accéder
    à ces endpoints.
    """

    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def _get_room_for_request_user(self) -> ChatRoom:
        """
        Récupere le ChatRoom ciblé et vérifie que l'utilisateur courant en est membre.
        """
        room_id = self.kwargs.get("room_id")
        room = get_object_or_404(ChatRoom, id=room_id)

        is_member = ChatRoomUser.objects.filter(room=room, user=self.request.user).exists()
        if not is_member:
            raise PermissionDenied("Vous n'avez pas accès à ce salon.")

        return room

    def get_queryset(self):
        room = self._get_room_for_request_user()
        return Message.objects.filter(room=room).order_by("created_at")

    def perform_create(self, serializer):
        room = self._get_room_for_request_user()
        serializer.save(room=room, user=self.request.user)
