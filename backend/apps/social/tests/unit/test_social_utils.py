"""Tests unitaires pour apps.social.utils."""

import pytest
from django.contrib.auth import get_user_model

from apps.social.models import FriendRequest
from apps.social.utils import are_friends, ordered_user_pair, pending_request_between

User = get_user_model()


class _NoPk:
    pass


@pytest.mark.django_db
class TestOrderedUserPair:
    def test_raises_when_same_id(self):
        with pytest.raises(ValueError, match="Identical"):
            ordered_user_pair(1, 1)

    def test_ordered_when_first_smaller(self):
        assert ordered_user_pair(1, 5) == (1, 5)

    def test_ordered_when_first_larger(self):
        assert ordered_user_pair(9, 2) == (2, 9)


@pytest.mark.django_db
class TestAreFriends:
    def test_false_without_pk(self, user):
        assert are_friends(_NoPk(), user) is False

    def test_false_same_user(self, user):
        assert are_friends(user, user) is False


@pytest.mark.django_db
class TestPendingRequestBetween:
    def test_returns_pending_request(self, user):
        other = User.objects.create_user(email="pr@ex.com", pseudo="pendpal", password="x" * 8 + "1Aa")
        fr = FriendRequest.objects.create(from_user=user, to_user=other, status=FriendRequest.Status.PENDING)
        found = pending_request_between(user, other)
        assert found is not None
        assert found.pk == fr.pk
