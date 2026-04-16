from celery import shared_task
from django.contrib.auth import get_user_model

from apps.library.steam_sync import sync_steam_library

User = get_user_model()


@shared_task(ignore_result=True)
def sync_steam_library_task(user_id: int):
    """
    Lance la synchronisation de la bibliothèque Steam d'un utilisateur en arrière-plan.
    """
    try:
        user = User.objects.get(id=user_id)
        sync_steam_library(user)
    except User.DoesNotExist:
        pass
