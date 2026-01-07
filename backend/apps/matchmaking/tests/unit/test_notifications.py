import pytest
from notifications.models import Notification

from apps.matchmaking.models import Match


@pytest.mark.django_db
def test_match_creation_creates_notifications_for_both_players(user, admin_user, game):
    """
    La création d'un Match doit générer une notification pour chaque joueur.
    """
    match = Match.objects.create(
        player1=user,
        player2=admin_user,
        game=game,
    )

    notifs = Notification.objects.filter(verb="match").order_by("recipient_id")

    assert notifs.count() == 2
    recipients = {n.recipient_id for n in notifs}
    assert recipients == {user.id, admin_user.id}

    notif_for_user = next(n for n in notifs if n.recipient_id == user.id)
    notif_for_admin = next(n for n in notifs if n.recipient_id == admin_user.id)

    # Le modèle Notification expose 'actor' via GenericForeignKey
    assert notif_for_user.actor == admin_user
    assert notif_for_admin.actor == user
    # La cible de la notification est le match
    assert notif_for_user.target == match
    assert notif_for_admin.target == match


@pytest.mark.django_db
def test_match_update_does_not_create_additional_notifications(user, admin_user, game):
    """
    Une mise à jour de Match (created=False dans le signal) ne doit pas générer
    de nouvelles notifications.
    """
    match = Match.objects.create(
        player1=user,
        player2=admin_user,
        game=game,
    )

    # Nettoyer les notifs créées lors de la création
    Notification.objects.filter(verb="match").delete()

    # Mise à jour -> created=False côté signal
    match.status = Match.STATUS_CLOSED
    match.save()

    assert Notification.objects.filter(verb="match").count() == 0
