import pytest

from apps.games.models import Game, Genre, Rating
from apps.library.models import UserGame
from apps.recommendations.utils import get_user_preferred_genre_ids


@pytest.mark.django_db
class TestRecommendationsUtils:
    def test_get_user_preferred_genre_ids(self, user, publisher):
        # Création de genres
        genre1 = Genre.objects.create(name="Action")
        genre2 = Genre.objects.create(name="RPG")
        genre3 = Genre.objects.create(name="Strategy")

        # Jeu dans la bibliothèque de l'utilisateur
        game1 = Game.objects.create(name="Game 1", publisher=publisher)
        game1.genres.add(genre1)
        UserGame.objects.create(user=user, game=game1)

        # Jeu avec une bonne note de l'utilisateur
        game2 = Game.objects.create(name="Game 2", publisher=publisher)
        game2.genres.add(genre2)
        Rating.objects.create(user=user, game=game2, rating_type=Rating.RATING_TYPE_SUR_10, value=8)

        # Jeu avec une mauvaise note (ne devrait pas être compté)
        game3 = Game.objects.create(name="Game 3", publisher=publisher)
        game3.genres.add(genre3)
        Rating.objects.create(user=user, game=game3, rating_type=Rating.RATING_TYPE_SUR_10, value=5)

        genre_ids = get_user_preferred_genre_ids(user)

        assert len(genre_ids) == 2
        assert genre1.id in genre_ids
        assert genre2.id in genre_ids
        assert genre3.id not in genre_ids
