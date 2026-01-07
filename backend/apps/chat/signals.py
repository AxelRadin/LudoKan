from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.signals import notify

from apps.chat.models import ChatRoomUser, Message


@receiver(post_save, sender=Message)
def create_message_notifications(sender, instance: Message, created: bool, **kwargs):
    """
    Génère une notification pour chaque membre du salon (sauf l'émetteur)
    lorsqu'un nouveau message est créé.

    - verb = "message"
    - actor = auteur du message
    - recipient = chaque autre membre du salon
    - target = la room
    - data = {room_id, message_id}
    """

    if not created:
        return

    room = instance.room
    actor = instance.user

    # Récupère tous les membres de la room, sauf l'auteur
    member_ids = ChatRoomUser.objects.filter(room=room).exclude(user=actor).values_list("user_id", flat=True)

    if not member_ids:
        return

    from django.contrib.auth import get_user_model

    User = get_user_model()
    recipients = User.objects.filter(id__in=member_ids)

    for recipient in recipients:
        notify.send(
            actor,
            recipient=recipient,
            verb="message",
            description="Nouveau message dans un salon de discussion",
            target=room,
            data={
                "room_id": room.id,
                "message_id": instance.id,
            },
        )
