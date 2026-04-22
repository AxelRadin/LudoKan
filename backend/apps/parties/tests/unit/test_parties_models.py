"""Tests des modèles `GameParty` / `GamePartyMember` (managers, querysets, helpers)."""

from __future__ import annotations

import pytest
from django.utils import timezone

from apps.parties.models import GamePartyMember
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
def test_game_party_member_queryset_and_manager_active_filter(game, user, another_user):
    party = open_party_factory(game=game, max_players=4)
    party_member_create(
        party=party,
        user=user,
        membership_status=GamePartyMember.MembershipStatus.LEFT,
        left_at=timezone.now(),
    )
    party_member_create(party=party, user=another_user)

    active_via_qs = GamePartyMember.objects.filter(party=party).active()
    assert not active_via_qs.filter(user=user).exists()
    assert active_via_qs.filter(user=another_user).exists()
    assert GamePartyMember.objects.active().filter(party=party, user=another_user).exists()


@pytest.mark.django_db
def test_game_party_str_and_active_member_helpers(game, user, another_user):
    party = open_party_factory(game=game, max_players=4)
    party_member_create(party=party, user=user)
    party_member_create(party=party, user=another_user)
    party.refresh_from_db()
    assert "GameParty" in str(party) and f"id={party.pk}" in str(party)
    assert party.active_members().count() == 2
    assert party.active_member_count() == 2

    m = GamePartyMember.objects.get(party=party, user=user)
    assert "GamePartyMember" in str(m)
