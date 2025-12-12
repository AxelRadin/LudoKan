import pytest
from apps.games.models import Game, Publisher, Genre, Platform
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def another_user(db):
    """Un second utilisateur pour les tests de propriété"""
    return User.objects.create_user(
        email="another@example.com",
        pseudo="anotheruser",
        password="testpass123",
    )


@pytest.fixture
def publisher(db):
    return Publisher.objects.create(name="Test Publisher")


@pytest.fixture
def genre(db):
    return Genre.objects.create(nom_genre="Test Genre")


@pytest.fixture
def platform(db):
    return Platform.objects.create(nom_plateforme="PC")


@pytest.fixture
def game(db, publisher, genre, platform):
    g = Game.objects.create(
        name="Test Game",
        description="Description test",
        publisher=publisher,
        min_players=1,
        max_players=4,
        min_age=12,
    )
    g.genres.add(genre)
    g.platforms.add(platform)
    return g
