"""Tests unitaires pour apps.social.services."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model

from apps.social.models import FriendRequest, Friendship, UserBlock
from apps.social.services import (
    accept_friend_request,
    block_user,
    cancel_friend_request,
    clear_pending_friend_requests_between,
    decline_friend_request,
    relation_state,
    remove_friendship,
    send_friend_request,
    unblock_user,
)
from apps.social.utils import create_friendship

User = get_user_model()


@pytest.fixture
def user_b(db):
    return User.objects.create_user(email="sb@ex.com", pseudo="userb", password="x" * 8 + "1Aa")


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestSendFriendRequest:
    def test_raises_self(self, _mock_notify, user, user_b):
        with pytest.raises(ValueError, match="soi-même"):
            send_friend_request(user, user)

    def test_raises_when_blocked(self, _mock_notify, user, user_b):
        UserBlock.objects.create(blocker=user_b, blocked=user)
        with pytest.raises(ValueError, match="blocage"):
            send_friend_request(user, user_b)

    def test_raises_already_friends(self, _mock_notify, user, user_b):
        ua, ub = sorted([user.pk, user_b.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        with pytest.raises(ValueError, match="déjà amis"):
            send_friend_request(user, user_b)

    def test_returns_existing_pending(self, _mock_notify, user, user_b):
        existing = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        res = send_friend_request(user, user_b)
        assert res.request.pk == existing.pk
        assert res.auto_accepted is False

    def test_auto_accept_reverse_pending(self, _mock_notify, user, user_b):
        FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        res = send_friend_request(user, user_b)
        assert res.auto_accepted is True
        assert Friendship.objects.filter(user_a_id=min(user.pk, user_b.pk), user_b_id=max(user.pk, user_b.pk)).exists()


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestAcceptDeclineCancel:
    def test_accept_wrong_recipient(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user, to_user=user_b, status=FriendRequest.Status.PENDING)
        with pytest.raises(PermissionError):
            accept_friend_request(fr, user)

    def test_accept_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user_b, to_user=user, status=FriendRequest.Status.DECLINED)
        with pytest.raises(ValueError, match="plus en attente"):
            accept_friend_request(fr, user)

    def test_decline_wrong_user(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user, to_user=user_b, status=FriendRequest.Status.PENDING)
        with pytest.raises(PermissionError):
            decline_friend_request(fr, user)

    def test_decline_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user_b, to_user=user, status=FriendRequest.Status.ACCEPTED)
        with pytest.raises(ValueError, match="plus en attente"):
            decline_friend_request(fr, user)

    def test_cancel_wrong_sender(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user_b, to_user=user, status=FriendRequest.Status.PENDING)
        with pytest.raises(PermissionError):
            cancel_friend_request(fr, user)

    def test_cancel_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(from_user=user, to_user=user_b, status=FriendRequest.Status.DECLINED)
        with pytest.raises(ValueError, match="plus en attente"):
            cancel_friend_request(fr, user)


@pytest.mark.django_db
class TestRemoveFriendship:
    def test_raises_when_not_friends(self, user, user_b):
        with pytest.raises(ValueError, match="Aucune amitié"):
            remove_friendship(user, user_b)


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestBlockUser:
    def test_raises_self_block(self, _mock_notify, user):
        with pytest.raises(ValueError, match="bloquer soi-même"):
            block_user(user, user)

    def test_deletes_friendship_when_friends(self, _mock_notify, user, user_b):
        create_friendship(user, user_b)
        block_user(user, user_b)
        assert not Friendship.objects.exists()


@pytest.mark.django_db
class TestUnblockUser:
    def test_false_when_nothing_deleted(self, user, user_b):
        assert unblock_user(user, user_b.pk) is False


@pytest.mark.django_db
class TestClearPending:
    def test_deletes_pending_both_directions(self, user, user_b):
        FriendRequest.objects.create(from_user=user, to_user=user_b, status=FriendRequest.Status.PENDING)
        FriendRequest.objects.create(from_user=user_b, to_user=user, status=FriendRequest.Status.PENDING)
        clear_pending_friend_requests_between(user, user_b)
        assert FriendRequest.objects.count() == 0


@pytest.mark.django_db
class TestRelationState:
    def test_anonymous(self, user):
        assert relation_state(None, user) == "anonymous"

    def test_self(self, user):
        assert relation_state(user, user) == "self"

    def test_friends(self, user, user_b):
        create_friendship(user, user_b)
        assert relation_state(user, user_b) == "friends"

    def test_none(self, user, user_b):
        assert relation_state(user, user_b) == "none"

    def test_pending_outgoing(self, user, user_b):
        FriendRequest.objects.create(from_user=user, to_user=user_b, status=FriendRequest.Status.PENDING)
        assert relation_state(user, user_b) == "pending_outgoing"

    def test_pending_incoming(self, user, user_b):
        FriendRequest.objects.create(from_user=user_b, to_user=user, status=FriendRequest.Status.PENDING)
        assert relation_state(user, user_b) == "pending_incoming"
