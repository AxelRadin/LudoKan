import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from apps.library.steam_sync import sync_steam_library
from apps.library.xbox_sync import sync_xbox_library

logger = logging.getLogger("system_logs")
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
        logger.error(f"Celery task failed: user_id={user_id} does not exist.")
    except Exception as e:
        logger.exception(f"Celery task failed for user_id={user_id}: {e}")


@shared_task(ignore_result=True)
def sync_xbox_library_task(user_id: int):
    """
    Lance la synchronisation de la bibliothèque Xbox d'un utilisateur en arrière-plan.
    """
    try:
        user = User.objects.get(id=user_id)
        sync_xbox_library(user)
    except User.DoesNotExist:
        logger.error(f"Celery task failed (Xbox): user_id={user_id} does not exist.")
    except Exception as e:
        logger.exception(f"Celery task failed (Xbox) for user_id={user_id}: {e}")
