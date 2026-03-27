from django.db.models.signals import post_save
from django.dispatch import receiver
from notifications.signals import notify

from apps.matchmaking.models import Match


@receiver(post_save, sender=Match)
def create_match_notifications(sender, instance: Match, created: bool, **kwargs):
    """
    Génère automatiquement des notifications lors de la création d'un match.

    - verb = "match"
    - actor = l'autre joueur
    - recipient = chaque joueur (une notif par joueur)
    - target = le match
    - data = {match_id, game_id, opponent_id}
    """

    if not created:
        return

    players = [
        (instance.player1, instance.player2),
        (instance.player2, instance.player1),
    ]

    for recipient, actor in players:
        notify.send(
            actor,
            recipient=recipient,
            verb="match",
            description=f"Vous avez un nouveau match pour {instance.game.name}",
            target=instance,
            data={
                "match_id": instance.id,
                "game_id": instance.game_id,
                "opponent_id": actor.id,
            },
        )
