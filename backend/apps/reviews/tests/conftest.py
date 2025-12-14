"""
Fixtures spécifiques aux tests de l'app reviews.
"""

import pytest
from django.contrib.auth import get_user_model

from apps.games.models import Game, Genre, Platform, Publisher, Rating

User = get_user_model()


@pytest.fixture
def user(db):
    """Utilisateur de test pour les reviews"""
    return User.objects.create_user(
        email="testreview@example.com",
        password="TestPass123!",
        pseudo="testreviewuser",
    )


@pytest.fixture
def user2(db):
    """Deuxième utilisateur de test pour tester l'unicité"""
    return User.objects.create_user(
        email="testreview2@example.com",
        password="TestPass123!",
        pseudo="testreviewuser2",
    )


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
        description="Jeu de test pour l'app reviews.",
        publisher=publisher,
    )
    game.genres.add(genre)
    game.platforms.add(platform)
    return game


@pytest.fixture
def rating(db, user, game):
    """Rating de test"""
    return Rating.objects.create(
        user=user,
        game=game,
        rating_type=Rating.RATING_TYPE_SUR_10,
        value=8,
    )
