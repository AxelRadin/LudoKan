from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.models import Notification

from apps.core.serializers import NotificationSerializer


@receiver(post_save, sender=Notification)
def push_notification_via_websocket(sender, instance: Notification, created: bool, **kwargs):
    """
    À chaque création de Notification, on envoie un événement sur le groupe
    WebSocket associé au destinataire :

        group: user_notifications_<recipient_id>

    Le payload suit un format JSON uniforme :
    {
        "type": "notification_message",
        "notification": { ...serializer data... }
    }

    Ce format est ensuite transformé par NotificationConsumer en :
    {
        "type": "notification",
        "notification": { ...serializer data... }
    }
    """

    if not created or not instance.recipient_id:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    group_name = f"user_notifications_{instance.recipient_id}"
    payload = NotificationSerializer(instance).data

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "notification_message",
            "notification": payload,
        },
    )
