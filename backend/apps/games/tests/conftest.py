"""
Fixtures spécifiques aux tests de l'app games.
Elles surchargent les fixtures globales pour être compatibles
avec le modèle CustomUser et les modèles Game/Publisher/Genre/Platform.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.models import Publisher, Genre, Platform, Game


User = get_user_model()


@pytest.fixture
def api_client():
    """Client DRF simple sans authentification"""
    return APIClient()


@pytest.fixture
def user(db):
    """Utilisateur de test pour les endpoints protégés"""
    return User.objects.create_user(
        email="testgames@example.com",
        password="TestPass123!",
        pseudo="testgamesuser",
    )


@pytest.fixture
def another_user(db):
    """Second test user for ownership checks."""
    return User.objects.create_user(
        email="anothergames@example.com",
        password="AnotherTestPass123!",
        pseudo="anothergamesuser",
    )


@pytest.fixture
def authenticated_api_client(user):
    """Client DRF avec authentification forcée"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def publisher(db):
    """Publisher de test"""
    return Publisher.objects.create(
        igdb_id=1001,
        name="Test Publisher",
        description="Publisher de test pour les jeux.",
        website="https://publisher.example.com",
    )


@pytest.fixture
def genre(db):
    """Genre de test"""
    return Genre.objects.create(
        igdb_id=2001,
        nom_genre="Test Genre",
        description="Genre de test.",
    )


@pytest.fixture
def platform(db):
    """Plateforme de test"""
    return Platform.objects.create(
        igdb_id=3001,
        nom_plateforme="Test Platform",
        description="Plateforme de test.",
    )


@pytest.fixture
def game(db, publisher, genre, platform):
    """Jeu de test avec ses relations"""
    game = Game.objects.create(
        igdb_id=4001,
        name="Test Game",
        description="Jeu de test pour l'app games.",
        publisher=publisher,
    )
    game.genres.add(genre)
    game.platforms.add(platform)
    return game

