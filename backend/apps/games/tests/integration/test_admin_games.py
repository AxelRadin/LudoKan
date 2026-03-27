from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.users.models import UserRole
from apps.users.tests.constants import TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(
        email="admingames@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="admingames",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_client(db):
    user = User.objects.create_user(
        email="modgames@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="modgames",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def authenticated_client(db):
    user = User.objects.create_user(
        email="normalgames@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="normalgames",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAdminGameListView:
    def test_admin_can_list_games_with_pagination(self, admin_client, game, publisher):
        # Créer un second jeu pour vérifier que la liste contient plusieurs entrées
        Game.objects.create(
            igdb_id=5001,
            name="Another Admin Game",
            description="Admin game 2",
            publisher=publisher,
        )

        url = "/api/admin/games/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert response.data["count"] >= 1

    def test_moderator_can_list_games(self, moderator_client, game):
        url = "/api/admin/games/"
        response = moderator_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_list_games(self, authenticated_client, game):
        url = "/api/admin/games/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_game_list_filters_and_invalid_min_rating(self, admin_client, game, publisher):
        # Forcer des valeurs pour tester les filtres
        game.average_rating = 7.5
        game.status = "released"
        game.save(update_fields=["average_rating", "status"])

        # Filtre par name et publisher_id
        resp_basic = admin_client.get(
            "/api/admin/games/",
            {"name": "Test", "publisher_id": publisher.id, "status": "released"},
        )
        assert resp_basic.status_code == status.HTTP_200_OK

        # Filtre par min_rating / max_rating
        resp_rating = admin_client.get("/api/admin/games/", {"min_rating": "5", "max_rating": "9"})
        assert resp_rating.status_code == status.HTTP_200_OK

        # Valeur invalide pour min_rating -> branche ValueError
        resp_invalid_min = admin_client.get("/api/admin/games/", {"min_rating": "not-a-number"})
        assert resp_invalid_min.status_code == status.HTTP_200_OK

        # Valeur invalide pour max_rating -> branche ValueError correspondante
        resp_invalid_max = admin_client.get("/api/admin/games/", {"max_rating": "not-a-number"})
        assert resp_invalid_max.status_code == status.HTTP_200_OK

        # Filtres de date created_before / created_after
        now = timezone.now()
        before = (now + timedelta(days=1)).isoformat()
        after = (now - timedelta(days=1)).isoformat()
        resp_dates = admin_client.get(
            "/api/admin/games/",
            {"created_before": before, "created_after": after},
        )
        assert resp_dates.status_code == status.HTTP_200_OK
