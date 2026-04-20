from datetime import timedelta

import pytest
from django.utils import timezone

from apps.parties.constants import MIN_PLAYERS_TO_CONTINUE
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services.recruitment import finalize_open_phase, join_or_create_party, select_open_party_for_recruitment
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
class TestRecruitmentJoinOrCreate:
    def test_creates_new_party_when_no_open_party_exists(self, game, user):
        party = join_or_create_party(user, game, max_players_override=6)
        assert party.game_id == game.id
        assert party.status == GameParty.Status.OPEN
        assert party.max_players == 6
        assert GameParty.objects.filter(game=game).count() == 1

    def test_reuses_existing_open_party(self, game, user, another_user):
        first = join_or_create_party(user, game, max_players_override=5)
        second = join_or_create_party(another_user, game, max_players_override=5)
        assert first.id == second.id
        assert GamePartyMember.objects.filter(party_id=first.id).count() == 2

    def test_prefers_more_full_party_then_older(self, game, user, another_user, third_user, fourth_user):
        p_sparse = open_party_factory(game=game, max_players=4)
        party_member_create(party=p_sparse, user=user)

        p_fuller = open_party_factory(game=game, max_players=4)
        party_member_create(party=p_fuller, user=another_user)
        party_member_create(party=p_fuller, user=third_user)

        chosen = join_or_create_party(fourth_user, game, max_players_override=4)
        assert chosen.id == p_fuller.id

    def test_cannot_exceed_max_players_creates_new_party_when_first_full(self, game, user, another_user, third_user):
        join_or_create_party(user, game, max_players_override=2)
        join_or_create_party(another_user, game, max_players_override=2)
        third_party = join_or_create_party(third_user, game, max_players_override=2)
        assert GameParty.objects.filter(game=game).count() == 2
        assert third_party.status == GameParty.Status.OPEN

    def test_open_to_waiting_ready_when_max_players_reached(self, game, user, another_user):
        join_or_create_party(user, game, max_players_override=2)
        party = join_or_create_party(another_user, game, max_players_override=2)
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY
        assert party.ready_deadline_at is not None


@pytest.mark.django_db
class TestRecruitmentOpenDeadline:
    def test_open_to_waiting_ready_when_deadline_expired_and_enough_members(self, game, user, another_user):
        past = timezone.now() - timedelta(hours=1)
        party = open_party_factory(game=game, max_players=5, open_deadline_at=past)
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)
        finalize_open_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY

    def test_open_cancelled_when_deadline_expired_and_not_enough_members(self, game, user):
        past = timezone.now() - timedelta(hours=1)
        party = open_party_factory(game=game, max_players=5, open_deadline_at=past)
        party_member_create(party=party, user=user)
        assert MIN_PLAYERS_TO_CONTINUE == 2
        finalize_open_phase(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED


@pytest.mark.django_db
def test_select_open_party_ordering_matches_join_priority(game, user, another_user, third_user):
    older_sparse = open_party_factory(game=game, max_players=4)
    party_member_create(party=older_sparse, user=user)

    newer_fuller = open_party_factory(game=game, max_players=4)
    party_member_create(party=newer_fuller, user=another_user)
    party_member_create(party=newer_fuller, user=third_user)

    selected = select_open_party_for_recruitment(game)
    assert selected is not None
    assert selected.id == newer_fuller.id
