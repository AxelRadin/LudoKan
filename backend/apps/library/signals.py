from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.library.models import UserGame
from apps.library.services_collections import attach_user_game_to_ma_ludotheque


@receiver(post_save, sender=UserGame)
def attach_new_user_game_to_ma_ludotheque(sender, instance: UserGame, **kwargs):
    """Tout UserGame appartient à « Ma ludothèque » (création ou import hors serializer)."""
    attach_user_game_to_ma_ludotheque(instance)
