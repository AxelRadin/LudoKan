"""
Tests pour les modèles de l'app games
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.games.models import Game, Publisher, Genre, Platform


@pytest.mark.django_db
class TestPublisherModel:
    """Tests pour le modèle Publisher"""

    def test_create_publisher(self):
        publisher = Publisher.objects.create(
            igdb_id=1234,
            name="Test Publisher",
            description="Un éditeur de test",
            website="https://example.com",
        )

        assert publisher.id is not None
        assert publisher.igdb_id == 1234
        assert publisher.name == "Test Publisher"

    def test_publisher_str(self, publisher):
        """__str__ doit renvoyer le nom"""
        assert str(publisher) == publisher.name

    def test_publisher_igdb_id_unique(self):
        Publisher.objects.create(
            igdb_id=9999,
            name="Pub 1",
        )

        with pytest.raises(IntegrityError):
            Publisher.objects.create(
                igdb_id=9999,
                name="Pub 2",
            )


@pytest.mark.django_db
class TestGenreModel:
    """Tests pour le modèle Genre"""

    def test_create_genre(self):
        genre = Genre.objects.create(
            igdb_id=2001,
            nom_genre="Adventure",
            description="Jeux d'aventure",
        )

        assert genre.id is not None
        assert genre.nom_genre == "Adventure"

    def test_genre_str(self, genre):
        """__str__ doit renvoyer le nom de genre"""
        assert str(genre) == genre.nom_genre

    def test_genre_igdb_id_unique(self):
        Genre.objects.create(
            igdb_id=7777,
            nom_genre="Genre 1",
        )

        with pytest.raises(IntegrityError):
            Genre.objects.create(
                igdb_id=7777,
                nom_genre="Genre 2",
            )


@pytest.mark.django_db
class TestPlatformModel:
    """Tests pour le modèle Platform"""

    def test_create_platform(self):
        platform = Platform.objects.create(
            igdb_id=3001,
            nom_plateforme="PC",
            description="Ordinateur personnel",
        )

        assert platform.id is not None
        assert platform.nom_plateforme == "PC"

    def test_platform_str(self, platform):
        """__str__ doit renvoyer le nom de la plateforme"""
        assert str(platform) == platform.nom_plateforme

    def test_platform_igdb_id_unique(self):
        Platform.objects.create(
            igdb_id=8888,
            nom_plateforme="Platform 1",
        )

        with pytest.raises(IntegrityError):
            Platform.objects.create(
                igdb_id=8888,
                nom_plateforme="Platform 2",
            )


@pytest.mark.django_db
class TestGameModel:
    """Tests pour le modèle Game"""

    def test_create_game_with_relations(self, publisher, genre, platform):
        """Création d'un jeu avec publisher, genres et plateformes"""
        game = Game.objects.create(
            igdb_id=4001,
            name="Test Game",
            description="Jeu de test",
            publisher=publisher,
            min_players=1,
            max_players=4,
            min_age=12,
        )
        game.genres.add(genre)
        game.platforms.add(platform)

        assert game.id is not None
        assert game.publisher == publisher
        assert genre in game.genres.all()
        assert platform in game.platforms.all()
        # Valeurs par défaut
        assert game.rating_avg == 0.0
        assert game.popularity_score == 0.0

    def test_game_str(self, game):
        """__str__ doit renvoyer le nom du jeu"""
        assert str(game) == game.name

    def test_game_igdb_id_unique(self, publisher):
        Game.objects.create(
            igdb_id=5555,
            name="Game 1",
            publisher=publisher,
        )

        with pytest.raises(IntegrityError):
            Game.objects.create(
                igdb_id=5555,
                name="Game 2",
                publisher=publisher,
            )

    def test_game_status_choices_validation(self, publisher):
        """Le champ status doit respecter les choices du modèle"""
        game = Game(
            name="Status Game",
            publisher=publisher,
            status="invalid_status",
        )

        with pytest.raises(ValidationError):
            game.full_clean()
