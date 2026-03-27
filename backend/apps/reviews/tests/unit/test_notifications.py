import pytest
from notifications.models import Notification

from apps.library.models import UserGame
from apps.reviews.models import Review


@pytest.mark.django_db
def test_review_creation_notifies_library_owners(user, user2, game):
    """
    La création d'un avis doit notifier les utilisateurs qui possèdent le jeu
    dans leur ludothèque, à l'exception de l'auteur.
    """
    # user2 possède le jeu, user est l'auteur de l'avis
    UserGame.objects.create(user=user2, game=game)

    Review.objects.create(
        user=user,
        game=game,
        content="Super jeu !",
    )

    notifs = Notification.objects.filter(verb="review")

    assert notifs.count() == 1
    notif = notifs.first()

    assert notif.recipient_id == user2.id
    # Le modèle Notification expose 'actor' via GenericForeignKey
    assert notif.actor == user
    # La cible de la notification est le jeu concerné
    assert notif.target == game
