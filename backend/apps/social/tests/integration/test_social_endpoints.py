"""
Tests d'intégration pour l'app social (demandes d'amis, liste d'amis).
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.social.models import FriendRequest, Friendship

User = get_user_model()


@pytest.mark.django_db
class TestSocialFriendRequests:
    def test_send_friend_request_by_pseudo(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="o@example.com", pseudo="otherpal", password="x" * 8 + "1Aa")
        url = "/api/social/friend-requests/"
        r = jwt_authenticated_client.post(url, {"to_pseudo": "otherpal"}, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        assert FriendRequest.objects.filter(from_user=user, to_user=other, status=FriendRequest.Status.PENDING).exists()

    def test_accept_friend_request(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="o2@example.com", pseudo="sender", password="x" * 8 + "1Aa")
        fr = FriendRequest.objects.create(from_user=other, to_user=user, status=FriendRequest.Status.PENDING)
        client_other = APIClient()
        from rest_framework_simplejwt.tokens import RefreshToken

        client_other.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(other).access_token}")
        r = jwt_authenticated_client.post(f"/api/social/friend-requests/{fr.pk}/accept/", {}, format="json")
        assert r.status_code == status.HTTP_200_OK
        assert Friendship.objects.count() == 1
        assert not FriendRequest.objects.filter(pk=fr.pk).exists()

    def test_mutual_pending_auto_accept(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="o3@example.com", pseudo="bouncer", password="x" * 8 + "1Aa")
        FriendRequest.objects.create(from_user=other, to_user=user, status=FriendRequest.Status.PENDING)
        r = jwt_authenticated_client.post(
            "/api/social/friend-requests/",
            {"to_pseudo": "bouncer"},
            format="json",
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data.get("auto_accepted") is True
        assert Friendship.objects.count() == 1

    def test_list_friends_empty(self, jwt_authenticated_client):
        r = jwt_authenticated_client.get("/api/social/friends/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data.get("results", r.data) == []

    def test_remove_friend(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="o4@example.com", pseudo="exfriend", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        r = jwt_authenticated_client.delete(f"/api/social/friends/{other.pk}/")
        assert r.status_code == status.HTTP_204_NO_CONTENT
        assert Friendship.objects.count() == 0


@pytest.mark.django_db
class TestUserSearch:
    def test_search_requires_auth(self, api_client):
        r = api_client.get("/api/social/users/search/?q=ab")
        assert r.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_returns_matches(self, jwt_authenticated_client, user):
        User.objects.create_user(email="findme@example.com", pseudo="findme_player", password="x" * 8 + "1Aa")
        r = jwt_authenticated_client.get("/api/social/users/search/?q=findme")
        assert r.status_code == status.HTTP_200_OK
        assert isinstance(r.data, list)
        pseudos = [row["pseudo"] for row in r.data]
        assert "findme_player" in pseudos
        assert user.pseudo not in pseudos

    def test_search_short_query_returns_empty(self, jwt_authenticated_client):
        r = jwt_authenticated_client.get("/api/social/users/search/?q=a")
        assert r.status_code == status.HTTP_200_OK
        assert r.data == []


@pytest.mark.django_db
class TestPublicProfileAndLibraryVisibility:
    def test_public_profile_has_no_email(self):
        User.objects.create_user(email="vis@example.com", pseudo="visibleme", password="x" * 8 + "1Aa")
        client = APIClient()
        r = client.get("/api/users/visibleme/profile/")
        assert r.status_code == status.HTTP_200_OK
        assert r.data.get("pseudo") == "visibleme"
        assert "email" not in r.data

    def test_friend_sees_friend_only_collection(self, jwt_authenticated_client, user):
        owner = User.objects.create_user(email="own@example.com", pseudo="libowner", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, owner.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        from apps.library.models import UserLibrary

        UserLibrary.objects.create(
            user=owner,
            name="Amis seulement",
            is_visible_on_profile=False,
            is_visible_to_friends=True,
        )
        r = jwt_authenticated_client.get("/api/users/libowner/collections/")
        assert r.status_code == status.HTTP_200_OK
        rows = r.data.get("results", r.data)
        names = [row["name"] for row in rows]
        assert "Amis seulement" in names
