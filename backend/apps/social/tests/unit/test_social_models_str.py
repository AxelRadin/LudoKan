"""Couverture des __str__ des modèles social."""

import pytest
from django.contrib.auth import get_user_model

from apps.social.models import FriendRequest, Friendship, UserBlock

User = get_user_model()


@pytest.mark.django_db
def test_friendship_str(user):
    other = User.objects.create_user(email="s@ex.com", pseudo="strpal", password="x" * 8 + "1Aa")
    ua, ub = sorted([user.pk, other.pk])
    f = Friendship.objects.create(user_a_id=ua, user_b_id=ub)
    assert str(ua) in str(f) and str(ub) in str(f)


@pytest.mark.django_db
def test_friend_request_str(user):
    other = User.objects.create_user(email="frs@ex.com", pseudo="frstr", password="x" * 8 + "1Aa")
    fr = FriendRequest.objects.create(from_user=user, to_user=other, status=FriendRequest.Status.PENDING)
    assert "→" in str(fr) and "pending" in str(fr)


@pytest.mark.django_db
def test_user_block_str(user):
    other = User.objects.create_user(email="ubs@ex.com", pseudo="ubstr", password="x" * 8 + "1Aa")
    b = UserBlock.objects.create(blocker=user, blocked=other)
    assert str(user.pk) in str(b) or str(other.pk) in str(b)
