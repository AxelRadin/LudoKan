"""
Tests pour les modèles de l'app games
"""
import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.games.models import Game, Genre, Platform, Publisher, Rating


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
        # Default values
        assert game.rating_avg == 0.0
        assert game.popularity_score == 0.0
        assert game.average_rating == 0.0
        assert game.rating_count == 0

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


@pytest.mark.django_db
class TestRatingModel:
    """Tests for the Rating model."""

    def test_create_rating_sur_100_valid(self, user, game):
        """A rating of type sur_100 within range should be valid."""
        rating = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_100,
            value=85,
        )

        # Should not raise
        rating.full_clean()
        rating.save()

        assert rating.id is not None
        assert rating.value == 85

    def test_unique_rating_per_user_and_game(self, user, game):
        """Only one rating per (user, game) pair should be allowed."""
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=8,
        )

        with pytest.raises(IntegrityError):
            Rating.objects.create(
                user=user,
                game=game,
                rating_type=Rating.RATING_TYPE_SUR_10,
                value=9,
            )

    def test_sur_100_out_of_range_raises_validation_error(self, user, game):
        """sur_100 ratings must be between 0 and 100."""
        rating = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_100,
            value=150,
        )

        with pytest.raises(ValidationError):
            rating.full_clean()

    def test_sur_10_out_of_range_raises_validation_error(self, user, game):
        """sur_10 ratings must be between 0 and 10."""
        rating = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=11,
        )

        with pytest.raises(ValidationError):
            rating.full_clean()

    def test_decimal_out_of_range_raises_validation_error(self, user, game):
        """decimal ratings must be between 0 and 10."""
        rating = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_DECIMAL,
            value=9.5,
        )

        # First ensure it's valid inside range
        rating.full_clean()

        rating_too_high = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_DECIMAL,
            value=11,
        )

        with pytest.raises(ValidationError):
            rating_too_high.full_clean()

    def test_etoiles_out_of_range_raises_validation_error(self, user, game):
        """etoiles ratings must be between 1 and 5."""
        rating_low = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=0,
        )
        rating_high = Rating(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=6,
        )

        with pytest.raises(ValidationError):
            rating_low.full_clean()

        with pytest.raises(ValidationError):
            rating_high.full_clean()

    def test_rating_str_representation(self, user, game):
        """__str__ should include user, game and value."""
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=5,
        )

        assert str(rating) == f"{user} - {game} ({rating.value})"

    def test_clean_returns_early_when_value_or_type_missing(self, user, game):
        """clean should return early when value or rating_type is None."""
        rating = Rating(user=user, game=game, rating_type=None, value=None)
        # Should not raise
        rating.clean()

    def test_clean_unknown_rating_type_raises_validation_error(self, user, game):
        """Unknown rating_type should raise a ValidationError."""
        rating = Rating(
            user=user,
            game=game,
            rating_type="unknown_type",
            value=5,
        )

        with pytest.raises(ValidationError):
            rating.clean()


@pytest.mark.django_db
class TestRatingAggregates:
    """Tests for automatic average_rating and rating_count updates via signals."""

    def test_average_rating_updates_on_create(self, user, another_user, game):
        """Creating ratings should update game's average_rating and rating_count."""
        # First rating: sur_10 = 8 -> normalized 8
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=8,
        )
        game.refresh_from_db()
        assert game.average_rating == 8.0
        assert game.rating_count == 1
        assert game.rating_avg == 8.0

        # Second rating: sur_100 = 90 -> normalized 9
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_100,
            value=90,
        )
        game.refresh_from_db()
        # Average of 8 and 9 = 8.5
        assert game.average_rating == pytest.approx(8.5)
        assert game.rating_count == 2
        assert game.rating_avg == pytest.approx(8.5)

    def test_average_rating_updates_on_delete(self, user, another_user, game):
        """Deleting a rating should recalculate game's average_rating and rating_count."""
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=8,
        )
        r2 = Rating.objects.create(
            user=another_user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=6,
        )
        game.refresh_from_db()
        assert game.average_rating == pytest.approx(7.0)
        assert game.rating_count == 2

        # Delete one rating
        r2.delete()
        game.refresh_from_db()
        assert game.average_rating == pytest.approx(8.0)
        assert game.rating_count == 1


class TestNormalizeRating:
    def test_normalize_rating_returns_zero_for_none_value(self):
        from apps.games.models import normalize_rating

        assert normalize_rating(Rating.RATING_TYPE_SUR_10, None) == 0.0

    def test_normalize_rating_for_unknown_type_returns_value_as_float(self):
        from apps.games.models import normalize_rating

        assert normalize_rating("unknown", 7) == 7.0
