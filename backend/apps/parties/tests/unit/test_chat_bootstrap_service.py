from datetime import timedelta

import pytest
from django.utils import timezone

from apps.chat.models import ChatRoom, ChatRoomUser
from apps.parties.models import GameParty
from apps.parties.services.chat_bootstrap import open_chat_if_eligible
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
class TestOpenChatIfEligible:
    def test_creates_group_room_and_memberships_when_countdown_expired(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_started_at = timezone.now() - timedelta(minutes=2)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_started_at", "countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        before_rooms = ChatRoom.objects.count()
        open_chat_if_eligible(party.id)
        party.refresh_from_db()

        assert party.status == GameParty.Status.CHAT_ACTIVE
        assert party.chat_room_id is not None
        assert ChatRoom.objects.count() == before_rooms + 1
        room = party.chat_room
        assert room.type == ChatRoom.TYPE_GROUP
        assert ChatRoomUser.objects.filter(room=room).count() == 2

    def test_double_call_is_idempotent(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        open_chat_if_eligible(party.id)
        party.refresh_from_db()
        rid = party.chat_room_id
        open_chat_if_eligible(party.id)
        party.refresh_from_db()
        assert party.chat_room_id == rid
        assert ChatRoom.objects.filter(id=rid).count() == 1

    def test_no_op_when_not_countdown(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)
        before = ChatRoom.objects.count()
        open_chat_if_eligible(party.id)
        assert ChatRoom.objects.count() == before
        party.refresh_from_db()
        assert party.status == GameParty.Status.WAITING_READY

    def test_no_op_when_countdown_not_expired(self, game, user, another_user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)
        before = ChatRoom.objects.count()
        open_chat_if_eligible(party.id)
        assert ChatRoom.objects.count() == before

    def test_cancels_when_not_enough_flow_members(self, game, user):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        open_chat_if_eligible(party.id)
        party.refresh_from_db()
        assert party.status == GameParty.Status.CANCELLED
        assert party.countdown_started_at is None
        assert party.countdown_ends_at is None

    def test_no_op_when_chat_room_already_set(self, game, user, another_user):
        room = ChatRoom.objects.create(type=ChatRoom.TYPE_GROUP)
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.chat_room = room
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["chat_room", "countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        open_chat_if_eligible(party.id)
        party.refresh_from_db()
        assert party.chat_room_id == room.id
        assert party.status == GameParty.Status.COUNTDOWN


@pytest.mark.django_db
def test_open_chat_if_eligible_returns_none_when_party_missing():
    assert open_chat_if_eligible(9_999_001) is None
