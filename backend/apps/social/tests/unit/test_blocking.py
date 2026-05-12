"""Tests unitaires pour apps.social.blocking."""

import pytest
from django.contrib.auth import get_user_model

from apps.social.blocking import blocked_user_ids_for, pair_has_block
from apps.social.models import UserBlock

User = get_user_model()


class _AnonymousLike:
    """Objet sans ``pk`` (comme un utilisateur non persisté)."""

    is_authenticated = False


@pytest.mark.django_db
class TestPairHasBlock:
    def test_false_when_a_is_none(self, user):
        assert pair_has_block(None, user) is False

    def test_false_when_missing_pk(self, user):
        assert pair_has_block(_AnonymousLike(), user) is False

    def test_false_same_user(self, user):
        assert pair_has_block(user, user) is False

    def test_true_when_block_exists(self, user):
        other = User.objects.create_user(email="pb@ex.com", pseudo="pairblk", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=user, blocked=other)
        assert pair_has_block(user, other) is True


@pytest.mark.django_db
class TestBlockedUserIdsFor:
    def test_empty_when_viewer_none(self):
        assert blocked_user_ids_for(None) == set()

    def test_empty_when_viewer_without_pk(self):
        assert blocked_user_ids_for(_AnonymousLike()) == set()

    def test_union_forward_and_reverse(self, user):
        a = user
        b = User.objects.create_user(email="bid@ex.com", pseudo="blkb", password="x" * 8 + "1Aa")
        c = User.objects.create_user(email="bid2@ex.com", pseudo="blkc", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=a, blocked=b)
        UserBlock.objects.create(blocker=c, blocked=a)
        ids = blocked_user_ids_for(a)
        assert b.pk in ids
        assert c.pk in ids
