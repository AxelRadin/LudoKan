"""Tests unitaires des helpers de lazy-open chat dans `apps.parties.views`."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.parties import views as parties_views
from apps.parties.models import GameParty
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
def test_maybe_lazy_open_chat_no_party_row():
    parties_views._maybe_lazy_open_chat(party_id=9_999_006)


@pytest.mark.django_db
def test_maybe_lazy_open_chat_countdown_not_expired(game, user):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
    party.countdown_ends_at = timezone.now() + timedelta(hours=1)
    party.save(update_fields=["countdown_ends_at"])
    party_member_create(party=party, user=user)
    parties_views._maybe_lazy_open_chat(party_id=party.id)
    party.refresh_from_db()
    assert party.status == GameParty.Status.COUNTDOWN
