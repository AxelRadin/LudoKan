import logging

from celery import shared_task
from django.utils import timezone

from apps.matchmaking.models import MatchmakingRequest

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={"max_retries": 3, "countdown": 10})
def expire_old_matchmaking_requests(self) -> int:
    """
    Tâche périodique :
    - expire toutes les demandes de matchmaking dépassées
    - retourne le nombre de lignes affectées
    """
    now = timezone.now()

    expired_qs = MatchmakingRequest.objects.pending().filter(expires_at__lte=now)
    ids = list(expired_qs.values_list("id", flat=True))

    count = expired_qs.update(status=MatchmakingRequest.STATUS_EXPIRED)

    logger.info(
        "Expired %s matchmaking requests at %s",
        count,
        now.isoformat(),
    )

    if ids:
        logger.debug("Expired matchmaking request IDs: %s", ids)

    return count
