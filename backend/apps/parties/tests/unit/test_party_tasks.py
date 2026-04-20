from datetime import timedelta
from unittest.mock import MagicMock

import pytest
from django.utils import timezone

from apps.parties.services import lifecycle as lifecycle_services
from apps.parties.services.chat_bootstrap import open_chat_if_eligible as real_open_chat_if_eligible
from apps.parties.models import GameParty
from apps.parties.tasks import (
    process_expired_countdown_parties,
    process_expired_open_parties,
    process_expired_ready_for_chat_parties,
    process_expired_ready_parties,
    process_party_deadlines,
)
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
class TestProcessExpiredOpenParties:
    def test_selects_expired_open_and_finalizes(self, game, user, another_user):
        past = timezone.now() - timedelta(hours=1)
        party = open_party_factory(game=game, max_players=4, open_deadline_at=past)
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        process_expired_open_parties()
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY

    def test_ignores_open_party_with_future_deadline(self, game, user):
        future = timezone.now() + timedelta(hours=2)
        party = open_party_factory(game=game, max_players=4, open_deadline_at=future)
        party_member_create(party=party, user=user)

        process_expired_open_parties()
        party.refresh_from_db()
        assert party.status == GameParty.Status.OPEN


@pytest.mark.django_db
class TestProcessExpiredReadyParties:
    def test_calls_finalize_for_expired_ready_deadline(self, game, user, monkeypatch):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user)

        spy = MagicMock(wraps=lifecycle_services.finalize_ready_phase)
        monkeypatch.setattr("apps.parties.tasks.finalize_ready_phase", spy)
        process_expired_ready_parties()
        spy.assert_called_once_with(party.id)


@pytest.mark.django_db
class TestProcessExpiredReadyForChatParties:
    def test_calls_finalize_for_expired_ready_for_chat(self, game, user, monkeypatch):
        party = open_party_factory(
            game=game,
            max_players=4,
            status=GameParty.Status.WAITING_READY_FOR_CHAT,
        )
        party.ready_for_chat_deadline_at = timezone.now() - timedelta(minutes=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(party=party, user=user)

        spy = MagicMock(wraps=lifecycle_services.finalize_ready_for_chat_phase)
        monkeypatch.setattr("apps.parties.tasks.finalize_ready_for_chat_phase", spy)
        process_expired_ready_for_chat_parties()
        spy.assert_called_once_with(party.id)


@pytest.mark.django_db
class TestProcessExpiredCountdownParties:
    def test_calls_open_chat_for_expired_countdown(self, game, user, another_user, monkeypatch):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        spy = MagicMock(wraps=real_open_chat_if_eligible)
        monkeypatch.setattr("apps.parties.tasks.open_chat_if_eligible", spy)
        process_expired_countdown_parties()
        spy.assert_called_once_with(party.id)


@pytest.mark.django_db
def test_process_party_deadlines_orchestrator_returns_summary(game, user, another_user):
    past = timezone.now() - timedelta(hours=1)
    party = open_party_factory(game=game, max_players=4, open_deadline_at=past)
    party_member_create(party=party, user=user)
    party_member_create(party=party, user=another_user)

    summary = process_party_deadlines()
    assert "open" in summary
    assert summary["open"]["selected"] >= 1
    party.refresh_from_db()
    assert party.status != GameParty.Status.OPEN
