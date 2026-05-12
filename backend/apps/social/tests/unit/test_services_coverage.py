"""Couverture exhaustive de apps.social.services."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model

from apps.social.models import FriendRequest, Friendship, UserBlock
from apps.social.services import (
    FRIEND_REQUEST_NOT_PENDING_MSG,
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
    return User.objects.create_user(email="svc_b@example.com", pseudo="svcb", password="x" * 8 + "1Aa")


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestSendFriendRequest:
    def test_self_raises(self, _mock_notify, user):
        with pytest.raises(ValueError, match="soi-même"):
            send_friend_request(user, user)

    def test_blocked_raises(self, _mock_notify, user, user_b):
        UserBlock.objects.create(blocker=user_b, blocked=user)
        with pytest.raises(ValueError, match="cet utilisateur"):
            send_friend_request(user, user_b)

    def test_already_friends_raises(self, _mock_notify, user, user_b):
        create_friendship(user, user_b)
        with pytest.raises(ValueError, match="déjà amis"):
            send_friend_request(user, user_b)

    def test_auto_accept_reverse_pending(self, _mock_notify, user, user_b):
        FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        res = send_friend_request(user, user_b)
        assert res.auto_accepted is True
        assert res.request is None
        assert Friendship.objects.filter(
            user_a_id=min(user.pk, user_b.pk),
            user_b_id=max(user.pk, user_b.pk),
        ).exists()

    def test_returns_existing_outgoing_pending(self, _mock_notify, user, user_b):
        existing = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        res = send_friend_request(user, user_b)
        assert res.auto_accepted is False
        assert res.request.pk == existing.pk

    def test_creates_after_deleting_stale_declined(self, _mock_notify, user, user_b):
        FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.DECLINED,
        )
        res = send_friend_request(user, user_b)
        assert res.request is not None
        assert res.request.status == FriendRequest.Status.PENDING
        assert FriendRequest.objects.filter(from_user=user, to_user=user_b).count() == 1


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestAcceptDeclineCancel:
    def test_accept_wrong_recipient(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        with pytest.raises(PermissionError):
            accept_friend_request(fr, user)

    def test_accept_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.DECLINED,
        )
        with pytest.raises(ValueError, match=FRIEND_REQUEST_NOT_PENDING_MSG):
            accept_friend_request(fr, user)

    def test_accept_success(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        friendship = accept_friend_request(fr, user)
        assert friendship is not None
        assert not FriendRequest.objects.filter(pk=fr.pk).exists()

    def test_decline_wrong_user(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        with pytest.raises(PermissionError):
            decline_friend_request(fr, user)

    def test_decline_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.ACCEPTED,
        )
        with pytest.raises(ValueError, match=FRIEND_REQUEST_NOT_PENDING_MSG):
            decline_friend_request(fr, user)

    def test_decline_success(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        decline_friend_request(fr, user)
        assert not FriendRequest.objects.filter(pk=fr.pk).exists()

    def test_cancel_wrong_sender(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        with pytest.raises(PermissionError):
            cancel_friend_request(fr, user)

    def test_cancel_not_pending(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.CANCELLED,
        )
        with pytest.raises(ValueError, match=FRIEND_REQUEST_NOT_PENDING_MSG):
            cancel_friend_request(fr, user)

    def test_cancel_success(self, _mock_notify, user, user_b):
        fr = FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        cancel_friend_request(fr, user)
        assert not FriendRequest.objects.filter(pk=fr.pk).exists()


@pytest.mark.django_db
class TestRemoveFriendship:
    def test_not_friends_raises(self, user, user_b):
        with pytest.raises(ValueError, match="Aucune amitié"):
            remove_friendship(user, user_b)

    def test_success(self, user, user_b):
        create_friendship(user, user_b)
        remove_friendship(user, user_b)
        assert not Friendship.objects.exists()


@pytest.mark.django_db
@patch("apps.social.services.notify.send")
class TestBlockUnblock:
    def test_block_self_raises(self, _mock_notify, user):
        with pytest.raises(ValueError, match="bloquer soi-même"):
            block_user(user, user)

    def test_block_deletes_friendship(self, _mock_notify, user, user_b):
        create_friendship(user, user_b)
        block_user(user, user_b)
        assert not Friendship.objects.exists()
        assert UserBlock.objects.filter(blocker=user, blocked=user_b).exists()

    def test_block_without_prior_friendship(self, _mock_notify, user, user_b):
        block_user(user, user_b)
        assert UserBlock.objects.filter(blocker=user, blocked=user_b).exists()

    def test_unblock_true_false(self, _mock_notify, user, user_b):
        assert unblock_user(user, user_b.pk) is False
        UserBlock.objects.create(blocker=user, blocked=user_b)
        assert unblock_user(user, user_b.pk) is True
        assert unblock_user(user, user_b.pk) is False


@pytest.mark.django_db
class TestClearPending:
    def test_clears_both_directions(self, user, user_b):
        FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
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
        FriendRequest.objects.create(
            from_user=user,
            to_user=user_b,
            status=FriendRequest.Status.PENDING,
        )
        assert relation_state(user, user_b) == "pending_outgoing"

    def test_pending_incoming(self, user, user_b):
        FriendRequest.objects.create(
            from_user=user_b,
            to_user=user,
            status=FriendRequest.Status.PENDING,
        )
        assert relation_state(user, user_b) == "pending_incoming"
