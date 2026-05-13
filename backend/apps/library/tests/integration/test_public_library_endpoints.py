"""Couverture des vues bibliothèque publique : blocage, jeux, collections, jeux en commun."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.library.models import UserGame, UserLibrary, UserLibraryEntry
from apps.social.models import Friendship, UserBlock

User = get_user_model()


@pytest.mark.django_db
class TestPublicLibraryBlocked:
    def test_public_games_404_when_blocked(self, user, game):
        owner = User.objects.create_user(email="bo@ex.com", pseudo="blkowner", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=owner, blocked=user)
        pub = UserLibrary.objects.create(user=owner, name="P", is_visible_on_profile=True)
        ug = UserGame.objects.create(user=owner, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub, user_game=ug)

        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
        r = client.get(f"/api/users/{owner.pseudo}/games/")
        assert r.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPublicUserGamesAndCollections:
    def test_public_games_list_returns_visible_games(self, api_client, user, game):
        pub = UserLibrary.objects.create(user=user, name="Pub", is_visible_on_profile=True)
        ug = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub, user_game=ug)
        r = api_client.get(f"/api/users/{user.pseudo}/games/")
        assert r.status_code == status.HTTP_200_OK
        rows = r.data.get("results", r.data)
        assert len(rows) >= 1

    def test_collection_games_empty_when_collection_hidden(self, api_client, user, game):
        hidden = UserLibrary.objects.create(
            user=user,
            name="Secret",
            is_visible_on_profile=False,
            is_visible_to_friends=False,
        )
        ug = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=hidden, user_game=ug)
        r = api_client.get(f"/api/users/{user.pseudo}/collections/{hidden.pk}/games/")
        assert r.status_code == status.HTTP_200_OK
        rows = r.data.get("results", r.data)
        assert rows == []

    def test_collection_games_returns_games_when_visible(self, api_client, user, game):
        pub = UserLibrary.objects.create(user=user, name="PubGames", is_visible_on_profile=True)
        ug = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub, user_game=ug)
        r = api_client.get(f"/api/users/{user.pseudo}/collections/{pub.pk}/games/")
        assert r.status_code == status.HTTP_200_OK
        rows = r.data.get("results", r.data)
        assert len(rows) >= 1
        assert any(row.get("game", {}).get("id") == game.id for row in rows)


@pytest.mark.django_db
class TestGamesInCommon:
    def test_forbidden_when_not_friends(self, jwt_authenticated_client, user, game):
        other = User.objects.create_user(email="nfc@ex.com", pseudo="notfriend", password="x" * 8 + "1Aa")
        r = jwt_authenticated_client.get(f"/api/users/{other.pseudo}/games-in-common/")
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_ok_for_friends_with_shared_game(self, jwt_authenticated_client, user, game):
        other = User.objects.create_user(email="gf@ex.com", pseudo="gicmate", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        pub_me = UserLibrary.objects.create(user=user, name="M", is_visible_on_profile=True)
        pub_ot = UserLibrary.objects.create(user=other, name="O", is_visible_on_profile=True)
        ug_me = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        ug_ot = UserGame.objects.create(user=other, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub_me, user_game=ug_me)
        UserLibraryEntry.objects.create(library=pub_ot, user_game=ug_ot)

        r = jwt_authenticated_client.get(f"/api/users/{other.pseudo}/games-in-common/")
        assert r.status_code == status.HTTP_200_OK
        rows = r.data.get("results", r.data)
        assert len(rows) >= 1
        assert any(row["game"]["id"] == game.id for row in rows)
