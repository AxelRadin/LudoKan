from datetime import timedelta

import pytest
from django.utils import timezone

from apps.parties.constants import MIN_PLAYERS_TO_CONTINUE
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services.lifecycle import (
    finalize_ready_for_chat_phase,
    finalize_ready_phase,
    leave_party,
    mark_ready,
    mark_ready_for_chat,
    reconcile_party_state,
)
from apps.parties.tests.conftest import open_party_factory, party_member_create


def _waiting_ready_party(*, game, user_a, user_b, ready_deadline_hours: float = 1.0):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    party.ready_deadline_at = timezone.now() + timedelta(hours=ready_deadline_hours)
    party.save(update_fields=["ready_deadline_at"])
    party_member_create(party=party, user=user_a, ready_state=GamePartyMember.ReadyState.PENDING)
    party_member_create(party=party, user=user_b, ready_state=GamePartyMember.ReadyState.PENDING)
    return party


@pytest.mark.django_db
class TestWaitingReadyPhase:
    def test_all_accept_before_deadline_moves_to_waiting_ready_for_chat(self, game, user, another_user):
        party = _waiting_ready_party(game=game, user_a=user, user_b=another_user, ready_deadline_hours=2)
        mark_ready(party_id=party.id, user=user, accepted=True)
        mark_ready(party_id=party.id, user=another_user, accepted=True)
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY_FOR_CHAT
        assert party.ready_for_chat_deadline_at is not None

    def test_deadline_marks_pending_ready_as_timed_out_and_keeps_accepted(self, game, user, another_user, third_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user, ready_state=GamePartyMember.ReadyState.ACCEPTED)
        party_member_create(party=party, user=another_user, ready_state=GamePartyMember.ReadyState.PENDING)
        party_member_create(party=party, user=third_user, ready_state=GamePartyMember.ReadyState.ACCEPTED)
        finalize_ready_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY_FOR_CHAT
        another = GamePartyMember.objects.get(party=party, user=another_user)
        assert another.ready_state == GamePartyMember.ReadyState.TIMED_OUT

    def test_deadline_cancels_when_not_enough_accepted(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user, ready_state=GamePartyMember.ReadyState.ACCEPTED)
        party_member_create(party=party, user=another_user, ready_state=GamePartyMember.ReadyState.DECLINED)
        finalize_ready_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED

    def test_leave_during_waiting_ready_cancels_when_below_min(self, game, user, another_user):
        party = _waiting_ready_party(game=game, user_a=user, user_b=another_user)
        leave_party(party_id=party.id, user=another_user)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED

    def test_leave_during_waiting_ready_advances_when_remaining_all_accepted(self, game, user, another_user, third_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user, ready_state=GamePartyMember.ReadyState.ACCEPTED)
        party_member_create(party=party, user=another_user, ready_state=GamePartyMember.ReadyState.ACCEPTED)
        party_member_create(party=party, user=third_user, ready_state=GamePartyMember.ReadyState.PENDING)
        leave_party(party_id=party.id, user=third_user)
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY_FOR_CHAT


@pytest.mark.django_db
class TestWaitingReadyForChatPhase:
    def test_all_accept_before_deadline_starts_countdown(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
        party.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(
            party=party,
            user=user,
            ready_state=GamePartyMember.ReadyState.ACCEPTED,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        party_member_create(
            party=party,
            user=another_user,
            ready_state=GamePartyMember.ReadyState.ACCEPTED,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        mark_ready_for_chat(party_id=party.id, user=user, accepted=True)
        mark_ready_for_chat(party_id=party.id, user=another_user, accepted=True)
        party.refresh_from_db()
        assert party.status == GameParty.Status.COUNTDOWN
        assert party.countdown_started_at is not None
        assert party.countdown_ends_at is not None

    def test_deadline_marks_pending_ready_for_chat_timed_out(self, game, user, another_user, third_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY_FOR_CHAT)
        party.ready_for_chat_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(
            party=party,
            user=user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
        )
        party_member_create(
            party=party,
            user=another_user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
        )
        party_member_create(
            party=party,
            user=third_user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        finalize_ready_for_chat_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.COUNTDOWN
        m = GamePartyMember.objects.get(party=party, user=third_user)
        assert m.ready_for_chat_state == GamePartyMember.ReadyForChatState.TIMED_OUT

    def test_deadline_cancels_when_not_enough_accepted_for_chat(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY_FOR_CHAT)
        party.ready_for_chat_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(
            party=party,
            user=user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
        )
        party_member_create(
            party=party,
            user=another_user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.DECLINED,
        )
        finalize_ready_for_chat_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED

    def test_leave_during_ready_for_chat_reconciles(self, game, user, another_user, third_user):
        party = open_party_factory(game=game, max_players=5, status=GameParty.Status.WAITING_READY_FOR_CHAT)
        party.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(
            party=party,
            user=user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
        )
        party_member_create(
            party=party,
            user=another_user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
        )
        party_member_create(
            party=party,
            user=third_user,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        leave_party(party_id=party.id, user=third_user)
        party.refresh_from_db()
        assert party.status == GameParty.Status.COUNTDOWN


@pytest.mark.django_db
def test_mark_ready_rejects_wrong_party_status(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    party_member_create(party=party, user=user)
    with pytest.raises(ValueError):
        mark_ready(party_id=party.id, user=user, accepted=True)
