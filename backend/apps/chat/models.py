from django.conf import settings
from django.db import models


class ChatRoom(models.Model):
    """
    Salon de chat entre deux utilisateurs (direct only pour l'instant).

    On garde un champ `type` avec un seul choix possible pour le moment,
    afin de pouvoir supporter d'autres types (ex: group) plus tard.
    """

    TYPE_DIRECT = "direct"

    ROOM_TYPE_CHOICES = [
        (TYPE_DIRECT, "Direct"),
    ]

    type = models.CharField(
        max_length=10,
        choices=ROOM_TYPE_CHOICES,
        default=TYPE_DIRECT,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ChatRoomUser",
        related_name="chat_rooms",
    )

    class Meta:
        verbose_name = "Chat room"
        verbose_name_plural = "Chat rooms"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"ChatRoom(id={self.id}, type={self.type})"


class ChatRoomUser(models.Model):
    """
    Liaison entre un utilisateur et un salon de chat.

    Dans ce projet, les salons sont des chats directs entre deux utilisateurs
    uniquement. Cette table permet cependant d'étendre facilement à plus
    d'utilisateurs si nécessaire.
    """

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_memberships",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Chat room member"
        verbose_name_plural = "Chat room members"
        constraints = [
            models.UniqueConstraint(
                fields=["room", "user"],
                name="unique_chatroom_user",
            )
        ]

    def __str__(self) -> str:
        return f"ChatRoomUser(room_id={self.room_id}, user_id={self.user_id})"


class Message(models.Model):
    """
    Message envoyé dans un salon de chat.

    - Chaque message est lié à un user (auteur) et un ChatRoom.
    - `is_read` indique, dans le contexte d'un chat direct, si le message
      a été lu par le destinataire.
    """

    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    content = models.TextField()

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["room", "created_at"], name="chat_message_room_created_idx"),
        ]

    def __str__(self) -> str:
        return f"Message(id={self.id}, room_id={self.room_id}, user_id={self.user_id})"
