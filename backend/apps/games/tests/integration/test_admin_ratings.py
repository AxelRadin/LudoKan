import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Rating
from apps.users.models import AdminAction, UserRole

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Utilisateur admin avec rôle ADMIN pour les endpoints ratings admin."""
    user = User.objects.create_user(
        email="adminratings@example.com",
        password="AdminPass123!",
        pseudo="adminratings",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    return user


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def authenticated_client(user):
    """Client authentifié en tant qu'utilisateur normal (non admin)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_user(db):
    """Utilisateur avec rôle MODERATOR (lecture seule sur endpoints admin)."""
    user = User.objects.create_user(
        email="modratings@example.com",
        password="ModPass123!",
        pseudo="modratings",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)
    return user


@pytest.fixture
def moderator_client(moderator_user):
    client = APIClient()
    client.force_authenticate(user=moderator_user)
    return client


@pytest.mark.django_db
class TestAdminRatingEndpoints:
    def test_admin_can_list_ratings_with_rating_read_permission(self, admin_client, user, another_user, game):
        Rating.objects.create(user=user, game=game, rating_type=Rating.RATING_TYPE_SUR_10, value=7)
        Rating.objects.create(user=another_user, game=game, rating_type=Rating.RATING_TYPE_SUR_10, value=8)

        url = "/api/admin/ratings/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_admin_list_ratings_can_filter_by_game_and_user(self, admin_client, user, another_user, game, publisher):
        from apps.games.models import Game

        other_game = Game.objects.create(
            igdb_id=6001,
            name="Other Rating Game",
            publisher=publisher,
        )

        r1 = Rating.objects.create(user=user, game=game, rating_type=Rating.RATING_TYPE_SUR_10, value=7)
        r2 = Rating.objects.create(user=another_user, game=other_game, rating_type=Rating.RATING_TYPE_SUR_10, value=9)

        url = "/api/admin/ratings/"

        # Filtre par game_id
        resp_game = admin_client.get(url, {"game_id": game.id})
        assert resp_game.status_code == status.HTTP_200_OK
        assert len(resp_game.data) == 1
        assert resp_game.data[0]["id"] == r1.id

        # Filtre par user_id
        resp_user = admin_client.get(url, {"user_id": another_user.id})
        assert resp_user.status_code == status.HTTP_200_OK
        assert len(resp_user.data) == 1
        assert resp_user.data[0]["id"] == r2.id

    def test_non_admin_cannot_list_ratings(self, authenticated_client, user, game):
        Rating.objects.create(user=user, game=game, rating_type=Rating.RATING_TYPE_SUR_10, value=7)

        url = "/api/admin/ratings/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_moderator_can_list_but_cannot_delete(self, moderator_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=7,
        )

        # Listing autorisé
        list_url = "/api/admin/ratings/"
        list_response = moderator_client.get(list_url)
        assert list_response.status_code == status.HTTP_200_OK
        assert len(list_response.data) == 1

        # DELETE interdit
        detail_url = f"/api/admin/ratings/{rating.id}/"
        delete_response = moderator_client.delete(detail_url)
        assert delete_response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_delete_rating_and_logs_action(self, admin_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=7,
        )

        url = f"/api/admin/ratings/{rating.id}/"
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Rating.objects.filter(id=rating.id).exists()

        assert AdminAction.objects.filter(
            action_type="rating.delete",
            target_type="rating",
            target_id=rating.id,
        ).exists()

    def test_non_admin_cannot_delete_rating(self, authenticated_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=7,
        )

        url = f"/api/admin/ratings/{rating.id}/"
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
