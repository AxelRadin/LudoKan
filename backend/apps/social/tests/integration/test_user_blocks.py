"""Tests blocage utilisateur (API, recherche, profil public, demandes d’ami)."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.social.models import FriendRequest, Friendship, UserBlock

User = get_user_model()


@pytest.mark.django_db
class TestUserBlocks:
    def test_block_removes_friendship_and_pending(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="blk@ex.com", pseudo="blockedpal", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        fr = FriendRequest.objects.create(from_user=other, to_user=user, status=FriendRequest.Status.PENDING)
        r = jwt_authenticated_client.post("/api/social/blocks/", {"user_id": other.pk}, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        assert UserBlock.objects.filter(blocker=user, blocked=other).exists()
        assert Friendship.objects.count() == 0
        assert not FriendRequest.objects.filter(pk=fr.pk).exists()

    def test_block_by_pseudo(self, jwt_authenticated_client, user):
        User.objects.create_user(email="bp@ex.com", pseudo="bypseudo", password="x" * 8 + "1Aa")
        r = jwt_authenticated_client.post("/api/social/blocks/", {"pseudo": "bypseudo"}, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        assert "pseudo" in r.data
        assert r.data["pseudo"] == "bypseudo"

    def test_list_and_unblock(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="lu@ex.com", pseudo="listed", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=user, blocked=other)
        r = jwt_authenticated_client.get("/api/social/blocks/")
        assert r.status_code == status.HTTP_200_OK
        assert isinstance(r.data, list)
        assert any(row["pseudo"] == "listed" for row in r.data)
        r2 = jwt_authenticated_client.delete(f"/api/social/blocks/{other.pk}/")
        assert r2.status_code == status.HTTP_204_NO_CONTENT
        assert not UserBlock.objects.filter(blocker=user, blocked=other).exists()

    def test_search_excludes_blocked_users_both_ways(self, jwt_authenticated_client, user):
        a = user
        b = User.objects.create_user(email="sb@ex.com", pseudo="searchblock", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=a, blocked=b)
        r = jwt_authenticated_client.get("/api/social/users/search/?q=search")
        assert r.status_code == status.HTTP_200_OK
        pseudos = [row["pseudo"] for row in r.data]
        assert "searchblock" not in pseudos

        from rest_framework_simplejwt.tokens import RefreshToken

        client_b = APIClient()
        client_b.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(b).access_token}")
        r2 = client_b.get("/api/social/users/search/?q=test")
        assert r2.status_code == status.HTTP_200_OK
        pseudos_b = [row["pseudo"] for row in r2.data]
        assert a.pseudo not in pseudos_b

    def test_public_profile_404_when_blocked(self, jwt_authenticated_client, user):
        owner = User.objects.create_user(email="own@ex.com", pseudo="ownerblk", password="x" * 8 + "1Aa")
        viewer = User.objects.create_user(email="vie@ex.com", pseudo="viewerblk", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=owner, blocked=viewer)
        from rest_framework_simplejwt.tokens import RefreshToken

        client_v = APIClient()
        client_v.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(viewer).access_token}")
        r = client_v.get(f"/api/users/{owner.pseudo}/profile/")
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_friend_request_rejected_when_blocked(self, jwt_authenticated_client, user):
        other = User.objects.create_user(email="frb@ex.com", pseudo="frblocked", password="x" * 8 + "1Aa")
        UserBlock.objects.create(blocker=user, blocked=other)
        r = jwt_authenticated_client.post("/api/social/friend-requests/", {"to_pseudo": "frblocked"}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_block_self(self, jwt_authenticated_client, user):
        r = jwt_authenticated_client.post("/api/social/blocks/", {"user_id": user.pk}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST
