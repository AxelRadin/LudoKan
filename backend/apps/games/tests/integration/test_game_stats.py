import pytest
from rest_framework import status

from apps.games.models import Game
from apps.library.models import UserGame


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
        }

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
