import pytest
from notifications.models import Notification

from apps.chat.models import Message


@pytest.mark.django_db
def test_message_creation_notifies_other_members(chat_room_with_two_members, user, chat_other_user):
    """
    La création d'un message doit notifier les autres membres du salon.
    """
    room = chat_room_with_two_members

    Message.objects.create(
        room=room,
        user=user,
        content="Hello there",
    )

    notifs = Notification.objects.filter(verb="message")

    assert notifs.count() == 1
    notif = notifs.first()

    assert notif.recipient_id == chat_other_user.id
    # Le modèle Notification utilise un GenericForeignKey 'actor'
    # on vérifie donc directement l'objet acteur.
    assert notif.actor == user
    # La cible de la notification est la room
    assert notif.target == room


@pytest.mark.django_db
def test_message_update_does_not_create_additional_notifications(chat_room_with_two_members, user, chat_other_user):
    """
    Une mise à jour de Message (created=False dans le signal) ne doit pas générer
    de nouvelles notifications.
    """
    room = chat_room_with_two_members

    message = Message.objects.create(
        room=room,
        user=user,
        content="Initial",
    )

    # Nettoyer les notifications créées lors de la création
    Notification.objects.filter(verb="message").delete()

    # Mise à jour du message -> created=False dans le signal
    message.content = "Updated"
    message.save()

    assert Notification.objects.filter(verb="message").count() == 0
