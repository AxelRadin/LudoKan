"""
Tâches Celery : deadlines des parties (open, ready, ready-for-chat, countdown).

Chaque batch sélectionne les lignes expirées puis délègue aux services existants
(idempotent si la party a déjà été traitée entre-temps).
"""

from __future__ import annotations

import logging
from typing import Callable

from celery import shared_task
from django.utils import timezone

from apps.parties.models import GameParty
from apps.parties.services.chat_bootstrap import open_chat_if_eligible
from apps.parties.services.lifecycle import finalize_ready_for_chat_phase, finalize_ready_phase
from apps.parties.services.recruitment import finalize_open_phase

logger = logging.getLogger(__name__)


def _process_party_ids(
    *,
    party_ids: list[int],
    process_one: Callable[[int], object],
    label: str,
) -> tuple[int, int]:
    """
    Retourne (succès, échecs). Continue le batch après une erreur sur une party.
    """
    ok = err = 0
    for party_id in party_ids:
        try:
            process_one(party_id)
            ok += 1
        except Exception:
            logger.exception("party_deadline_%s_failed party_id=%s", label, party_id)
            err += 1
    return ok, err


def process_expired_open_parties(now=None) -> dict[str, int]:
    now = now or timezone.now()
    ids = list(
        GameParty.objects.filter(
            status=GameParty.Status.OPEN,
            open_deadline_at__isnull=False,
            open_deadline_at__lte=now,
        ).values_list("id", flat=True)
    )
    ok, err = _process_party_ids(party_ids=ids, process_one=finalize_open_phase, label="open")
    logger.info(
        "party_deadlines_open selected=%s ok=%s err=%s",
        len(ids),
        ok,
        err,
    )
    return {"selected": len(ids), "ok": ok, "errors": err}


def process_expired_ready_parties(now=None) -> dict[str, int]:
    now = now or timezone.now()
    ids = list(
        GameParty.objects.filter(
            status=GameParty.Status.WAITING_READY,
            ready_deadline_at__isnull=False,
            ready_deadline_at__lte=now,
        ).values_list("id", flat=True)
    )
    ok, err = _process_party_ids(party_ids=ids, process_one=finalize_ready_phase, label="ready")
    logger.info(
        "party_deadlines_ready selected=%s ok=%s err=%s",
        len(ids),
        ok,
        err,
    )
    return {"selected": len(ids), "ok": ok, "errors": err}


def process_expired_ready_for_chat_parties(now=None) -> dict[str, int]:
    now = now or timezone.now()
    ids = list(
        GameParty.objects.filter(
            status=GameParty.Status.WAITING_READY_FOR_CHAT,
            ready_for_chat_deadline_at__isnull=False,
            ready_for_chat_deadline_at__lte=now,
        ).values_list("id", flat=True)
    )
    ok, err = _process_party_ids(
        party_ids=ids,
        process_one=finalize_ready_for_chat_phase,
        label="ready_for_chat",
    )
    logger.info(
        "party_deadlines_ready_for_chat selected=%s ok=%s err=%s",
        len(ids),
        ok,
        err,
    )
    return {"selected": len(ids), "ok": ok, "errors": err}


def process_expired_countdown_parties(now=None) -> dict[str, int]:
    now = now or timezone.now()
    ids = list(
        GameParty.objects.filter(
            status=GameParty.Status.COUNTDOWN,
            countdown_ends_at__isnull=False,
            countdown_ends_at__lte=now,
        ).values_list("id", flat=True)
    )
    ok, err = _process_party_ids(party_ids=ids, process_one=open_chat_if_eligible, label="countdown")
    logger.info(
        "party_deadlines_countdown selected=%s ok=%s err=%s",
        len(ids),
        ok,
        err,
    )
    return {"selected": len(ids), "ok": ok, "errors": err}


@shared_task
def process_party_deadlines() -> dict[str, dict[str, int]]:
    """
    Traite les deadlines expirées pour toutes les phases concernées (ordre : open → ready → …).
    Idempotent : chaque sous-appel délègue aux services qui re-vérifient statut / dates.
    """
    summary = {
        "open": process_expired_open_parties(),
        "waiting_ready": process_expired_ready_parties(),
        "waiting_ready_for_chat": process_expired_ready_for_chat_parties(),
        "countdown": process_expired_countdown_parties(),
    }
    logger.info("party_deadlines_batch_complete summary=%s", summary)
    return summary
