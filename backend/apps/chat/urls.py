from django.urls import path

from apps.chat.views import ChatMessageListCreateView

urlpatterns = [
    path("chats/<int:room_id>/messages", ChatMessageListCreateView.as_view(), name="chat-messages"),
]
