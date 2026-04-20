from datetime import timedelta

import pytest
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.parties.constants import DEFAULT_PARTY_MAX_PLAYERS, MIN_PLAYERS_TO_CONTINUE
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services import recruitment as recruitment_services
from apps.parties.services.recruitment import (
    _ensure_active_membership,
    finalize_open_phase,
    join_or_create_party,
    resolve_party_max_players,
    select_open_party_for_recruitment,
    transition_open_to_waiting_ready,
)
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


@pytest.mark.django_db
class TestResolvePartyMaxPlayers:
    def test_rejects_invalid_override(self, game):
        with pytest.raises(ValueError, match="max_players_override must be >= 1"):
            resolve_party_max_players(game, max_players_override=0)

    def test_uses_game_max_players_when_valid(self, game):
        game.max_players = 8
        game.save(update_fields=["max_players"])
        assert resolve_party_max_players(game) == 8

    def test_defaults_when_game_max_players_unusable(self, game):
        game.max_players = None
        game.save(update_fields=["max_players"])
        assert resolve_party_max_players(game) == DEFAULT_PARTY_MAX_PLAYERS

        game.max_players = 0
        game.save(update_fields=["max_players"])
        assert resolve_party_max_players(game) == DEFAULT_PARTY_MAX_PLAYERS


@pytest.mark.django_db
def test_transition_open_to_waiting_ready_idempotent_when_not_open(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    party_member_create(party=party, user=user)
    before = party.ready_deadline_at
    transition_open_to_waiting_ready(party)
    party.refresh_from_db()
    assert party.status == GameParty.Status.WAITING_READY
    assert party.ready_deadline_at == before


@pytest.mark.django_db
def test_finalize_open_phase_returns_none_when_missing():
    assert finalize_open_phase(9_999_005) is None


@pytest.mark.django_db
def test_ensure_active_membership_recovers_from_integrity_error(game, another_user, monkeypatch):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    real_create = GamePartyMember.objects.create

    def create_then_integrity(**kwargs):
        real_create(**kwargs)
        raise IntegrityError("simulated race")

    monkeypatch.setattr(recruitment_services.GamePartyMember.objects, "create", create_then_integrity)
    with transaction.atomic():
        member = _ensure_active_membership(party, another_user)
    assert member.user_id == another_user.id
    assert member.membership_status == GamePartyMember.MembershipStatus.ACTIVE


@pytest.mark.django_db
def test_ensure_active_membership_reactivates_inactive_row(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
    m = party_member_create(
        party=party,
        user=user,
        membership_status=GamePartyMember.MembershipStatus.LEFT,
        left_at=timezone.now(),
    )
    with transaction.atomic():
        out = _ensure_active_membership(party, user)
    out.refresh_from_db()
    assert out.pk == m.pk
    assert out.membership_status == GamePartyMember.MembershipStatus.ACTIVE
    assert out.left_at is None
