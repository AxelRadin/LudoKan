"""
Configuration globale des tests pytest
"""
import os

import django
import pytest

# Configuration Django pour les tests
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.contrib.auth import get_user_model  # noqa: E402
from django.test import Client  # noqa: E402
from rest_framework.test import APIClient  # noqa: E402
from rest_framework_simplejwt.tokens import RefreshToken  # noqa: E402

User = get_user_model()


@pytest.fixture
def api_client():
    """Client API pour les tests REST"""
    return APIClient()


@pytest.fixture
def django_client():
    """Client Django standard"""
    return Client()


@pytest.fixture
def user(db):
    """Utilisateur de test"""
    return User.objects.create_user(
        email="test@example.com",
        pseudo="testuser",
        password="testpass123",
    )


@pytest.fixture
def admin_user(db):
    """Utilisateur administrateur de test"""
    return User.objects.create_superuser(
        email="admin@example.com",
        pseudo="admin",
        password="adminpass123",
    )


@pytest.fixture
def authenticated_api_client(user):
    """Client API authentifié"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def jwt_authenticated_client(user):
    """Client API avec authentification JWT"""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


@pytest.fixture
def sample_game_data():
    """Données de jeu de test"""
    return {
        "title": "Test Game",
        "description": "A test game for unit testing",
        "genre": "Strategy",
        "min_players": 2,
        "max_players": 4,
        "play_time": 60,
        "complexity": "Medium",
    }


@pytest.fixture
def sample_user_data():
    """Données utilisateur de test"""
    return {
        "email": "newuser@example.com",
        "password": "newpass123",
        "pseudo": "newuser",
        "first_name": "New",
        "last_name": "User",
    }


@pytest.fixture
def mock_redis():
    """Mock Redis pour les tests"""
    from unittest.mock import Mock

    mock_redis = Mock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = True
    return mock_redis


@pytest.fixture
def mock_celery_task():
    """Mock pour les tâches Celery"""
    from unittest.mock import Mock

    mock_task = Mock()
    mock_task.delay.return_value = Mock(id="test-task-id")
    mock_task.apply_async.return_value = Mock(id="test-task-id")
    return mock_task


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Active l'accès à la base de données pour tous les tests
    """
    pass
