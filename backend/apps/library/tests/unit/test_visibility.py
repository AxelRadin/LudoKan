"""Tests unitaires pour apps.library.visibility."""

import pytest
from django.contrib.auth import get_user_model

from apps.library.models import UserGame, UserLibrary, UserLibraryEntry
from apps.library.visibility import collections_visible_to_viewer_queryset, viewer_can_see_collection, visible_user_games_queryset
from apps.social.models import Friendship

User = get_user_model()


@pytest.mark.django_db
class TestViewerCanSeeCollection:
    def test_wrong_owner_id_returns_false(self, user):
        lib = UserLibrary.objects.create(user=user, name="L", is_visible_on_profile=True)
        assert viewer_can_see_collection(owner_id=999999, viewer=user, library=lib) is False

    def test_visible_on_profile_true_anonymous_ok(self, user):
        lib = UserLibrary.objects.create(user=user, name="Pub", is_visible_on_profile=True)
        assert viewer_can_see_collection(owner_id=user.pk, viewer=None, library=lib) is True

    def test_not_on_profile_anonymous_false(self, user):
        lib = UserLibrary.objects.create(
            user=user,
            name="Priv",
            is_visible_on_profile=False,
            is_visible_to_friends=True,
        )
        assert viewer_can_see_collection(owner_id=user.pk, viewer=None, library=lib) is False

    def test_owner_sees_private_collection(self, user):
        lib = UserLibrary.objects.create(
            user=user,
            name="Mine",
            is_visible_on_profile=False,
            is_visible_to_friends=False,
        )
        assert viewer_can_see_collection(owner_id=user.pk, viewer=user, library=lib) is True

    def test_friend_sees_friends_only_when_flag(self, user, game):
        other = User.objects.create_user(email="f@ex.com", pseudo="friendu", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        lib = UserLibrary.objects.create(
            user=other,
            name="Amis",
            is_visible_on_profile=False,
            is_visible_to_friends=True,
        )
        assert viewer_can_see_collection(owner_id=other.pk, viewer=user, library=lib) is True

    def test_non_friend_no_access_when_not_public(self, user, game):
        other = User.objects.create_user(email="nf@ex.com", pseudo="nofriend", password="x" * 8 + "1Aa")
        lib = UserLibrary.objects.create(
            user=other,
            name="Priv",
            is_visible_on_profile=False,
            is_visible_to_friends=True,
        )
        assert viewer_can_see_collection(owner_id=other.pk, viewer=user, library=lib) is False


@pytest.mark.django_db
class TestCollectionsVisibleToViewerQueryset:
    def test_friend_includes_friends_only_libraries(self, user, game):
        other = User.objects.create_user(email="o@ex.com", pseudo="ownlib", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        UserLibrary.objects.create(
            user=other,
            name="FriendsOnly",
            is_visible_on_profile=False,
            is_visible_to_friends=True,
        )
        qs = collections_visible_to_viewer_queryset(other, user)
        assert qs.filter(name="FriendsOnly").exists()

    def test_visible_user_games_respects_library_visibility(self, user, game):
        other = User.objects.create_user(email="og@ex.com", pseudo="gameown", password="x" * 8 + "1Aa")
        pub = UserLibrary.objects.create(
            user=other,
            name="Pub",
            is_visible_on_profile=True,
        )
        ug = UserGame.objects.create(user=other, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub, user_game=ug)
        vg = visible_user_games_queryset(other, None)
        assert vg.filter(pk=ug.pk).exists()
