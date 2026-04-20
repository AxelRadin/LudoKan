from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.chat.models import ChatRoom, ChatRoomUser
from apps.parties.constants import MIN_PLAYERS_TO_CONTINUE
from apps.parties.models import GameParty
from apps.parties.services.members import active_member_count, active_members_qs
from apps.parties.services.party_state_helpers import cancel_party


def flow_member_user_ids_for_chat_opening(*, party_id: int) -> list[int]:
    """Identifiants utilisateurs des membres du flow au moment de l’ouverture du chat."""
    return list(active_members_qs(party_id=party_id).order_by("user_id").values_list("user_id", flat=True).distinct())


def _create_group_chat_room() -> ChatRoom:
    return ChatRoom.objects.create(type=ChatRoom.TYPE_GROUP)


def _ensure_chat_room_users(*, room: ChatRoom, user_ids: list[int]) -> None:
    for uid in user_ids:
        ChatRoomUser.objects.get_or_create(room=room, user_id=uid)


def _attach_party_to_chat_and_activate(party: GameParty, room: ChatRoom) -> None:
    party.chat_room = room
    party.status = GameParty.Status.CHAT_ACTIVE
    party.save(update_fields=["chat_room", "status", "updated_at"])


def _open_chat_after_countdown_if_eligible_locked(party: GameParty) -> GameParty:
    """
    Tente l’ouverture du chat. La ligne `party` doit être verrouillée (`select_for_update`)
    et à jour dans la transaction courante.
    """
    now = timezone.now()

    if party.status != GameParty.Status.COUNTDOWN:
        return party

    if party.chat_room_id is not None:
        return party

    if party.countdown_ends_at is None or now < party.countdown_ends_at:
        return party

    n_flow = active_member_count(party_id=party.id)
    if n_flow < MIN_PLAYERS_TO_CONTINUE:
        cancel_party(party, clear_countdown=True)
        return party

    user_ids = flow_member_user_ids_for_chat_opening(party_id=party.id)

    room = _create_group_chat_room()
    _ensure_chat_room_users(room=room, user_ids=user_ids)
    _attach_party_to_chat_and_activate(party, room)
    party.refresh_from_db()
    return party


@transaction.atomic
def open_chat_if_eligible(party_id: int) -> GameParty | None:
    """
    Ouvre le salon de groupe à la fin du countdown si toutes les conditions sont réunies.

    Idempotent : safe en double appel, retry ou concurrence (verrou exclusif sur la party).
    """
    try:
        party = GameParty.objects.select_for_update().get(pk=party_id)
    except GameParty.DoesNotExist:
        return None
    return _open_chat_after_countdown_if_eligible_locked(party)
