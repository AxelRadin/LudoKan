from datetime import timedelta

import pytest
from django.utils import timezone

from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services.lifecycle import (
    _all_flow_members_ready_accepted,
    _all_flow_members_ready_for_chat_accepted,
    _reconcile_countdown,
    _reconcile_waiting_ready,
    _reconcile_waiting_ready_for_chat,
    finalize_ready_for_chat_phase,
    finalize_ready_phase,
    leave_party,
    mark_ready,
    mark_ready_for_chat,
    reconcile_party_state,
    start_countdown,
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


@pytest.mark.django_db
class TestReconcilePartyState:
    def test_open_phase_cancels_when_below_min_flow(self, game, user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
        party_member_create(party=party, user=user)
        reconcile_party_state(party)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED

    def test_open_phase_calls_transition_when_enough_members(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)
        reconcile_party_state(party)
        party.refresh_from_db()
        assert party.status == GameParty.Status.OPEN


@pytest.mark.django_db
def test_private_reconcile_helpers_noop_on_wrong_status(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    party_member_create(party=party, user=user)
    _reconcile_waiting_ready(party)
    _reconcile_waiting_ready_for_chat(party)
    _reconcile_countdown(party)
    party.refresh_from_db()
    assert party.status == GameParty.Status.OPEN


@pytest.mark.django_db
def test_all_flow_members_ready_flags_false_when_no_active_members(game):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    assert _all_flow_members_ready_accepted(party_id=party.id) is False
    assert _all_flow_members_ready_for_chat_accepted(party_id=party.id) is False


@pytest.mark.django_db
def test_reconcile_countdown_cancels_when_too_few_members(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
    party_member_create(party=party, user=user)
    reconcile_party_state(party)
    party.refresh_from_db()
    assert party.status == GameParty.Status.CANCELLED


@pytest.mark.django_db
def test_mark_ready_raises_when_user_not_in_active_flow(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    party.ready_deadline_at = timezone.now() + timedelta(hours=1)
    party.save(update_fields=["ready_deadline_at"])
    party_member_create(
        party=party,
        user=user,
        ready_state=GamePartyMember.ReadyState.PENDING,
        left_at=timezone.now(),
    )
    with pytest.raises(ValueError, match="not an active participant"):
        mark_ready(party_id=party.id, user=user, accepted=True)


@pytest.mark.django_db
def test_mark_ready_for_chat_raises_when_user_not_in_active_flow(game, another_user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
    party.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
    party.save(update_fields=["ready_for_chat_deadline_at"])
    party_member_create(
        party=party,
        user=another_user,
        ready_state=GamePartyMember.ReadyState.ACCEPTED,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        left_at=timezone.now(),
    )
    with pytest.raises(ValueError, match="not an active participant"):
        mark_ready_for_chat(party_id=party.id, user=another_user, accepted=True)


@pytest.mark.django_db
def test_leave_party_idempotent_when_already_left(game, user, another_user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    party.ready_deadline_at = timezone.now() + timedelta(hours=1)
    party.save(update_fields=["ready_deadline_at"])
    party_member_create(party=party, user=user)
    party_member_create(party=party, user=another_user, ready_state=GamePartyMember.ReadyState.PENDING)

    leave_party(party_id=party.id, user=user)
    m1, p1 = leave_party(party_id=party.id, user=user)
    assert m1.membership_status == GamePartyMember.MembershipStatus.LEFT
    assert p1.status == GameParty.Status.CANCELLED


@pytest.mark.django_db
def test_finalize_ready_phase_branches(game, user):
    assert finalize_ready_phase(9_999_002) is None

    open_p = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    party_member_create(party=open_p, user=user)
    assert finalize_ready_phase(open_p.id).id == open_p.id

    wr = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    wr.ready_deadline_at = timezone.now() + timedelta(hours=1)
    wr.save(update_fields=["ready_deadline_at"])
    party_member_create(party=wr, user=user)
    out = finalize_ready_phase(wr.id)
    assert out is not None and out.id == wr.id
    wr.refresh_from_db()
    assert wr.status == GameParty.Status.WAITING_READY


@pytest.mark.django_db
def test_finalize_ready_for_chat_phase_branches(game, user):
    assert finalize_ready_for_chat_phase(9_999_003) is None

    open_p = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    party_member_create(party=open_p, user=user)
    assert finalize_ready_for_chat_phase(open_p.id).id == open_p.id

    wrc = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
    wrc.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
    wrc.save(update_fields=["ready_for_chat_deadline_at"])
    party_member_create(
        party=wrc,
        user=user,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
    )
    out = finalize_ready_for_chat_phase(wrc.id)
    assert out is not None and out.id == wrc.id


@pytest.mark.django_db
def test_start_countdown_branches(game, user, another_user):
    assert start_countdown(9_999_004) is None

    cd = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
    party_member_create(party=cd, user=user)
    party_member_create(party=cd, user=another_user)
    assert start_countdown(cd.id).id == cd.id

    open_p = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    party_member_create(party=open_p, user=user)
    assert start_countdown(open_p.id).id == open_p.id

    wrc = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
    wrc.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
    wrc.save(update_fields=["ready_for_chat_deadline_at"])
    party_member_create(
        party=wrc,
        user=user,
        ready_state=GamePartyMember.ReadyState.ACCEPTED,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
    )
    party_member_create(
        party=wrc,
        user=another_user,
        ready_state=GamePartyMember.ReadyState.ACCEPTED,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
    )
    assert start_countdown(wrc.id).id == wrc.id

    wrc2 = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
    wrc2.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
    wrc2.save(update_fields=["ready_for_chat_deadline_at"])
    party_member_create(
        party=wrc2,
        user=user,
        ready_state=GamePartyMember.ReadyState.ACCEPTED,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
    )
    party_member_create(
        party=wrc2,
        user=another_user,
        ready_state=GamePartyMember.ReadyState.ACCEPTED,
        ready_for_chat_state=GamePartyMember.ReadyForChatState.ACCEPTED,
    )
    start_countdown(wrc2.id)
    wrc2.refresh_from_db()
    assert wrc2.status == GameParty.Status.COUNTDOWN
