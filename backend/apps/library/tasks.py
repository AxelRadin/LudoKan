import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from apps.library.steam_sync import sync_steam_library

logger = logging.getLogger("system_logs")
User = get_user_model()


@shared_task(ignore_result=True)
def sync_steam_library_task(user_id: int):
    """
    Lance la synchronisation de la bibliothèque Steam d'un utilisateur en arrière-plan.
    """
    logger.info(f"Starting Celery task: sync_steam_library_task for user_id={user_id}")
    try:
        user = User.objects.get(id=user_id)
        sync_steam_library(user)
        logger.info(f"Finished Celery task: sync_steam_library_task for user_id={user_id}")
    except User.DoesNotExist:
        logger.error(f"Celery task failed: user_id={user_id} does not exist.")
    except Exception as e:
        logger.error(f"Celery task failed for user_id={user_id}: {e}")
