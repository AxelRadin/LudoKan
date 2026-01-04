import pytest
from django.test import override_settings
from rest_framework import status

from apps.games.models import Game, Rating
from apps.library.models import UserGame
from apps.reviews.models import Review


@pytest.mark.django_db
class TestGameStatsView:
    """Tests for GET /api/games/{game_id}/stats/"""

    def test_game_stats_game_not_found(self, api_client):
        response = api_client.get("/api/games/999999/stats/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_game_stats_no_owners(self, api_client, game):
        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data == {
            "game_id": game.id,
            "owners_count": 0,
            "owners_by_status": {
                "en_cours": 0,
                "termine": 0,
                "abandonne": 0,
            },
            "ratings": {
                "average": 0.0,
                "count": 0,
                "distribution": {
                    "1": 0,
                    "2": 0,
                    "3": 0,
                    "4": 0,
                    "5": 0,
                },
            },
            "reviews": {
                "count": 0,
                "last_created_at": None,
            },
        }

    def test_game_stats_with_ratings_distribution(
        self,
        api_client,
        user,
        another_user,
        game,
    ):
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=3,
        )

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK

        ratings = response.data["ratings"]
        assert ratings["count"] == 2
        assert ratings["average"] == pytest.approx((5 * 2 + 3 * 2) / 2)

        assert ratings["distribution"] == {
            "1": 0,
            "2": 0,
            "3": 1,
            "4": 0,
            "5": 1,
        }

    @override_settings(DEBUG=True)
    def test_game_stats_with_reviews(self, api_client, user, another_user, game):
        Review.objects.create(user=user, game=game, content="Très bon jeu")
        review2 = Review.objects.create(
            user=another_user,
            game=game,
            content="Encore meilleur après mise à jour",
        )

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK

        reviews = response.data["reviews"]
        assert reviews["count"] == 2
        assert reviews["last_created_at"].isoformat().replace("+00:00", "Z") == review2.date_created.isoformat().replace("+00:00", "Z")

    def test_game_stats_single_owner_default_status(self, api_client, user, game):
        UserGame.objects.create(user=user, game=game)

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["owners_count"] == 1
        assert response.data["owners_by_status"] == {
            "en_cours": 1,
            "termine": 0,
            "abandonne": 0,
        }

    def test_game_stats_multiple_owners_mixed_statuses(
        self,
        api_client,
        user,
        another_user,
        game,
    ):
        UserGame.objects.create(
            user=user,
            game=game,
            status=UserGame.GameStatus.EN_COURS,
        )
        UserGame.objects.create(
            user=another_user,
            game=game,
            status=UserGame.GameStatus.TERMINE,
        )

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["owners_count"] == 2
        assert response.data["owners_by_status"] == {
            "en_cours": 1,
            "termine": 1,
            "abandonne": 0,
        }

    def test_game_stats_ignores_other_games(
        self,
        api_client,
        user,
        game,
        publisher,
    ):
        other_game = Game.objects.create(
            igdb_id=99999,
            name="Other Game",
            publisher=publisher,
        )

        UserGame.objects.create(user=user, game=game)
        UserGame.objects.create(user=user, game=other_game)

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["owners_count"] == 1
        assert response.data["owners_by_status"]["en_cours"] == 1

    def test_game_stats_ignores_other_game_ratings(
        self,
        api_client,
        user,
        game,
        publisher,
    ):
        other_game = Game.objects.create(
            igdb_id=88888,
            name="Other Game",
            publisher=publisher,
        )

        Rating.objects.create(
            user=user,
            game=other_game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )

        response = api_client.get(f"/api/games/{game.id}/stats/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["ratings"]["count"] == 0
