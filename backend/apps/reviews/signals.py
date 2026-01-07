from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.signals import notify

from apps.library.models import UserGame
from apps.reviews.models import Review


@receiver(post_save, sender=Review)
def create_review_notifications(sender, instance: Review, created: bool, **kwargs):
    """
    Génère des notifications lors de la création d'un avis sur un jeu.

    Stratégie choisie :
    - On notifie les utilisateurs qui ont le jeu dans leur ludothèque (UserGame),
      à l'exception de l'auteur de l'avis.

    - verb = "review"
    - actor = auteur de l'avis
    - recipient = chaque utilisateur possédant le jeu (sauf l'auteur)
    - target = le jeu
    - data = {review_id, game_id}
    """

    if not created:
        return

    actor = instance.user
    game = instance.game

    # Tous les possesseurs du jeu, sauf l'auteur de l'avis
    user_ids = UserGame.objects.filter(game=game).exclude(user=actor).values_list("user_id", flat=True)

    if not user_ids:
        return

    from django.contrib.auth import get_user_model

    User = get_user_model()
    recipients = User.objects.filter(id__in=user_ids)

    for recipient in recipients:
        notify.send(
            actor,
            recipient=recipient,
            verb="review",
            description=f"Nouveau avis publié sur {game.name}",
            target=game,
            data={
                "review_id": instance.id,
                "game_id": game.id,
            },
        )
