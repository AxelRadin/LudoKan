from django.conf import settings
from django.db import models


class ChatRoom(models.Model):
    """
    Salon de chat entre deux utilisateurs (direct only pour l'instant).

    On garde un champ `type` avec un seul choix possible pour le moment,
    afin de pouvoir supporter d'autres types (ex: group) plus tard.
    """

    TYPE_DIRECT = "direct"
    TYPE_GROUP = "group"

    ROOM_TYPE_CHOICES = [
        (TYPE_DIRECT, "Direct"),
        (TYPE_GROUP, "Group"),
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


class MessageRead(models.Model):
    """
    Statut de lecture d'un message pour un utilisateur donné.

    - Un enregistrement par (message, user) quand ce user a lu ce message.
    - Permet de gérer proprement les read-receipts, y compris en groupe.
    """

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reads",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="message_reads",
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message read"
        verbose_name_plural = "Message reads"
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"],
                name="unique_message_read_per_user",
            )
        ]

    def __str__(self) -> str:
        return f"MessageRead(message_id={self.message_id}, user_id={self.user_id})"
