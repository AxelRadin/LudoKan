from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from apps.parties.constants import CHAT_COUNTDOWN, MIN_PLAYERS_TO_CONTINUE, READY_FOR_CHAT_TIMEOUT
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services.members import active_member_count, active_members_qs
from apps.parties.services.party_state_helpers import cancel_party
from apps.parties.services.recruitment import transition_open_to_waiting_ready


def _timeout_pending_ready_states(*, party_id: int) -> int:
    return (
        active_members_qs(party_id=party_id)
        .filter(
            ready_state=GamePartyMember.ReadyState.PENDING,
        )
        .update(ready_state=GamePartyMember.ReadyState.TIMED_OUT)
    )


def _timeout_pending_ready_for_chat_states(*, party_id: int) -> int:
    return (
        active_members_qs(party_id=party_id)
        .filter(
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        .update(ready_for_chat_state=GamePartyMember.ReadyForChatState.TIMED_OUT)
    )


def _all_flow_members_ready_accepted(*, party_id: int) -> bool:
    qs = active_members_qs(party_id=party_id)
    if not qs.exists():
        return False
    return not qs.exclude(ready_state=GamePartyMember.ReadyState.ACCEPTED).exists()


def _all_flow_members_ready_for_chat_accepted(*, party_id: int) -> bool:
    qs = active_members_qs(party_id=party_id)
    if not qs.exists():
        return False
    return not qs.exclude(ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED).exists()


def _enter_waiting_ready_for_chat_phase(party: GameParty) -> None:
    now = timezone.now()
    party.status = GameParty.Status.WAITING_READY_FOR_CHAT
    party.ready_for_chat_deadline_at = now + READY_FOR_CHAT_TIMEOUT
    party.save(update_fields=["status", "ready_for_chat_deadline_at", "updated_at"])


def _start_countdown_on_party(party: GameParty) -> None:
    now = timezone.now()
    party.status = GameParty.Status.COUNTDOWN
    party.countdown_started_at = now
    party.countdown_ends_at = now + CHAT_COUNTDOWN
    party.save(update_fields=["status", "countdown_started_at", "countdown_ends_at", "updated_at"])


def _reconcile_open_phase(party: GameParty) -> None:
    n_flow = active_member_count(party_id=party.id)
    if n_flow < MIN_PLAYERS_TO_CONTINUE:
        cancel_party(party)
        return
    transition_open_to_waiting_ready(party)


def _reconcile_waiting_ready(party: GameParty) -> None:
    if party.status != GameParty.Status.WAITING_READY:
        return
    now = timezone.now()
    n_flow = active_member_count(party_id=party.id)
    if n_flow < MIN_PLAYERS_TO_CONTINUE:
        cancel_party(party)
        return

    deadline_hit = party.ready_deadline_at is not None and now >= party.ready_deadline_at
    if deadline_hit:
        _timeout_pending_ready_states(party_id=party.id)
        n_valid = (
            active_members_qs(party_id=party.id)
            .filter(
                ready_state=GamePartyMember.ReadyState.ACCEPTED,
            )
            .count()
        )
        if n_valid >= MIN_PLAYERS_TO_CONTINUE:
            _enter_waiting_ready_for_chat_phase(party)
        else:
            cancel_party(party)
        return

    if _all_flow_members_ready_accepted(party_id=party.id):
        _enter_waiting_ready_for_chat_phase(party)


def _reconcile_waiting_ready_for_chat(party: GameParty) -> None:
    if party.status != GameParty.Status.WAITING_READY_FOR_CHAT:
        return
    now = timezone.now()
    n_flow = active_member_count(party_id=party.id)
    if n_flow < MIN_PLAYERS_TO_CONTINUE:
        cancel_party(party)
        return

    deadline_hit = party.ready_for_chat_deadline_at is not None and now >= party.ready_for_chat_deadline_at
    if deadline_hit:
        _timeout_pending_ready_for_chat_states(party_id=party.id)
        n_valid = (
            active_members_qs(party_id=party.id)
            .filter(
                ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
            )
            .count()
        )
        if n_valid >= MIN_PLAYERS_TO_CONTINUE:
            _start_countdown_on_party(party)
        else:
            cancel_party(party)
        return

    if _all_flow_members_ready_for_chat_accepted(party_id=party.id):
        _start_countdown_on_party(party)


def _reconcile_countdown(party: GameParty) -> None:
    if party.status != GameParty.Status.COUNTDOWN:
        return
    n_flow = active_member_count(party_id=party.id)
    if n_flow < MIN_PLAYERS_TO_CONTINUE:
        cancel_party(party, clear_countdown=True)


def reconcile_party_state(party: GameParty) -> GameParty:
    """
    Recalcule immédiatement la party selon son statut courant (composition / validations).

    L'instance `party` doit correspondre à une ligne déjà verrouillée (`select_for_update`)
    dans la transaction courante lorsque des courses sont possibles.

    `cancelled` et `chat_active` : aucune transition automatique ici (MVP).
    """
    party.refresh_from_db()
    status = party.status
    if status == GameParty.Status.OPEN:
        _reconcile_open_phase(party)
    elif status == GameParty.Status.WAITING_READY:
        _reconcile_waiting_ready(party)
    elif status == GameParty.Status.WAITING_READY_FOR_CHAT:
        _reconcile_waiting_ready_for_chat(party)
    elif status == GameParty.Status.COUNTDOWN:
        _reconcile_countdown(party)
    party.refresh_from_db()
    return party


@transaction.atomic
def mark_ready(*, party_id: int, user: AbstractBaseUser, accepted: bool) -> GamePartyMember:
    party = GameParty.objects.select_for_update().get(pk=party_id)
    member = GamePartyMember.objects.select_for_update().get(party_id=party_id, user=user)
    if party.status != GameParty.Status.WAITING_READY:
        raise ValueError("Party is not in waiting_ready status.")
    if not active_members_qs(party_id=party_id).filter(pk=member.pk).exists():
        raise ValueError("User is not an active participant in this party.")

    member.ready_state = GamePartyMember.ReadyState.ACCEPTED if accepted else GamePartyMember.ReadyState.DECLINED
    member.save(update_fields=["ready_state", "updated_at"])
    reconcile_party_state(party)
    member.refresh_from_db()
    return member


@transaction.atomic
def mark_ready_for_chat(*, party_id: int, user: AbstractBaseUser, accepted: bool) -> GamePartyMember:
    party = GameParty.objects.select_for_update().get(pk=party_id)
    member = GamePartyMember.objects.select_for_update().get(party_id=party_id, user=user)
    if party.status != GameParty.Status.WAITING_READY_FOR_CHAT:
        raise ValueError("Party is not in waiting_ready_for_chat status.")
    if not active_members_qs(party_id=party_id).filter(pk=member.pk).exists():
        raise ValueError("User is not an active participant in this party.")

    member.ready_for_chat_state = GamePartyMember.ReadyForChatState.ACCEPTED if accepted else GamePartyMember.ReadyForChatState.DECLINED
    member.save(update_fields=["ready_for_chat_state", "updated_at"])
    reconcile_party_state(party)
    member.refresh_from_db()
    return member


@transaction.atomic
def leave_party(*, party_id: int, user: AbstractBaseUser) -> tuple[GamePartyMember, GameParty]:
    party = GameParty.objects.select_for_update().get(pk=party_id)
    member = GamePartyMember.objects.select_for_update().get(party_id=party_id, user=user)

    if member.membership_status == GamePartyMember.MembershipStatus.LEFT or member.left_at is not None:
        reconcile_party_state(party)
        party.refresh_from_db()
        return member, party

    now = timezone.now()
    member.membership_status = GamePartyMember.MembershipStatus.LEFT
    member.left_at = now
    member.save(update_fields=["membership_status", "left_at", "updated_at"])
    reconcile_party_state(party)
    party.refresh_from_db()
    return member, party


@transaction.atomic
def finalize_ready_phase(party_id: int) -> GameParty | None:
    try:
        party = GameParty.objects.select_for_update().get(pk=party_id)
    except GameParty.DoesNotExist:
        return None
    if party.status != GameParty.Status.WAITING_READY:
        return party
    now = timezone.now()
    if party.ready_deadline_at is None or now < party.ready_deadline_at:
        return party
    return reconcile_party_state(party)


@transaction.atomic
def finalize_ready_for_chat_phase(party_id: int) -> GameParty | None:
    try:
        party = GameParty.objects.select_for_update().get(pk=party_id)
    except GameParty.DoesNotExist:
        return None
    if party.status != GameParty.Status.WAITING_READY_FOR_CHAT:
        return party
    now = timezone.now()
    if party.ready_for_chat_deadline_at is None or now < party.ready_for_chat_deadline_at:
        return party
    return reconcile_party_state(party)


@transaction.atomic
def start_countdown(party_id: int) -> GameParty | None:
    """
    Démarre le countdown si la party est en `waiting_ready_for_chat` et que tous les
    membres du flow ont déjà accepté. Idempotent si déjà en `countdown`.
    """
    try:
        party = GameParty.objects.select_for_update().get(pk=party_id)
    except GameParty.DoesNotExist:
        return None
    if party.status == GameParty.Status.COUNTDOWN:
        return party
    if party.status != GameParty.Status.WAITING_READY_FOR_CHAT:
        return party
    if not _all_flow_members_ready_for_chat_accepted(party_id=party.id):
        return party
    _start_countdown_on_party(party)
    party.refresh_from_db()
    return party
