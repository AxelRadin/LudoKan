"""Tests des permissions DRF des parties."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from django.contrib.auth.models import AnonymousUser

from apps.parties.permissions import IsPartyFlowMember
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
def test_is_party_flow_member_denies_anonymous_user(game, user):
    party = open_party_factory(game=game, max_players=4)
    party_member_create(party=party, user=user)
    request = MagicMock()
    request.user = AnonymousUser()
    assert IsPartyFlowMember().has_object_permission(request, None, party) is False
