"""
Fixtures et helpers pour les tests `apps.parties`.

Les fixtures `user`, `game`, `api_client` et `authenticated_api_client`
proviennent du `conftest.py` à la racine du projet de tests (rootdir).
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.parties.models import GameParty, GamePartyMember

User = get_user_model()


@pytest.fixture
def another_user(db):
    """Second utilisateur (prioritaire sur le plugin games pour la résolution pytest des fixtures)."""
    return User.objects.create_user(
        email="anotherparties@example.com",
        password="AnotherTestPass123!",
        pseudo="anotherpartiesuser",
    )


@pytest.fixture
def third_user(db):
    return User.objects.create_user(
        email="third@example.com",
        password="pass12345!",
        pseudo="thirduser",
    )


@pytest.fixture
def fourth_user(db):
    return User.objects.create_user(
        email="fourth@example.com",
        password="pass12345!",
        pseudo="fourthuser",
    )


def party_member_create(
    *,
    party: GameParty,
    user,
    membership_status=GamePartyMember.MembershipStatus.ACTIVE,
    ready_state=GamePartyMember.ReadyState.PENDING,
    ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
    left_at=None,
):
    return GamePartyMember.objects.create(
        party=party,
        user=user,
        membership_status=membership_status,
        ready_state=ready_state,
        ready_for_chat_state=ready_for_chat_state,
        left_at=left_at,
    )


def open_party_factory(*, game, max_players: int = 4, **kwargs):
    now = timezone.now()
    defaults = dict(
        game=game,
        status=GameParty.Status.OPEN,
        max_players=max_players,
        open_deadline_at=now + timedelta(hours=1),
    )
    defaults.update(kwargs)
    return GameParty.objects.create(**defaults)
