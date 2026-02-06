import pytest
from django.contrib.auth import get_user_model
from notifications.models import Notification
from notifications.signals import notify

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.unit
def test_create_notification_with_notify_signal(user):
    """
    Vérifie qu'une notification peut être créée via le signal `notify`.
    """
    notify.send(
        user,
        recipient=user,
        verb="test notification",
        description="Notification de test pour vérifier la configuration",
    )

    assert Notification.objects.filter(recipient=user, verb="test notification").exists()
