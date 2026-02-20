"""
Tests pour l'endpoint GET /api/admin/reports/games/
Rapport détaillé jeux pour les rapports planifiés.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Game, Rating
from apps.library.models import UserGame
from apps.reviews.models import Review
from apps.users.models import UserRole
from apps.users.tests.constants import TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(
        email="adminreportsgames@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="adminreportsgames",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_client(db):
    user = User.objects.create_user(
        email="modreportsgames@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="modreportsgames",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def normal_client(db):
    user = User.objects.create_user(
        email="normalreports@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="normalreports",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAdminReportsGamesView:
    """Tests pour GET /api/admin/reports/games/."""

    def test_admin_can_retrieve_games_report_structure(self, admin_client, game):
        """Réponse contient popular_games, top_genres, ratings_summary, reviews_recent, platforms_breakdown."""
        url = "/api/admin/reports/games/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "popular_games" in data
        assert "top_genres" in data
        assert "ratings_summary" in data
        assert "reviews_recent" in data
        assert "platforms_breakdown" in data
        assert isinstance(data["popular_games"], list)
        assert isinstance(data["top_genres"], list)
        assert isinstance(data["ratings_summary"], dict)
        assert "average" in data["ratings_summary"]
        assert "total_count" in data["ratings_summary"]
        assert isinstance(data["reviews_recent"], int)
        assert isinstance(data["platforms_breakdown"], list)

    def test_popular_games_items_have_expected_keys(self, admin_client, game, user, publisher):
        """Chaque entrée de popular_games a id, name, average_rating, owners_count."""
        cache.clear()
        UserGame.objects.create(user=user, game=game)
        url = "/api/admin/reports/games/"
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        popular = response.data["popular_games"]
        if popular:
            for item in popular:
                assert "id" in item
                assert "name" in item
                assert "average_rating" in item
                assert "owners_count" in item

    def test_ratings_summary_and_reviews_recent_values(self, admin_client, game, user, publisher):
        """ratings_summary et reviews_recent sont cohérents avec la base."""
        cache.clear()
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=4,
        )
        Review.objects.create(user=user, game=game, content="Avis de test assez long pour validation.")
        url = "/api/admin/reports/games/"
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["ratings_summary"]["total_count"] == Rating.objects.count()
        month_ago = timezone.now() - timedelta(days=30)
        assert response.data["reviews_recent"] == Review.objects.filter(date_created__gte=month_ago).count()

    def test_moderator_can_access_reports_games(self, moderator_client, game):
        """Moderator a dashboard.view donc peut accéder à /api/admin/reports/games/."""
        response = moderator_client.get("/api/admin/reports/games/")
        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_access_reports_games(self, normal_client, game):
        """Utilisateur sans rôle admin reçoit 403."""
        response = normal_client.get("/api/admin/reports/games/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(ADMIN_REPORTS_GAMES_CACHE_TIMEOUT=60)
    def test_reports_games_uses_cache(self, admin_client, game, user, publisher):
        """Avec cache activé, le second appel renvoie les données en cache."""
        cache.clear()
        url = "/api/admin/reports/games/"
        response1 = admin_client.get(url)
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.data

        Game.objects.create(name="New game after cache", publisher=publisher)
        response2 = admin_client.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data == data1
