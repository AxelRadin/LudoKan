"""
Tests for GET /api/games/igdb/<igdb_id>/ — GameByIgdbIdView.

Contract: always returns a NormalizedGame structure.
Never creates a Game. Pure read-only endpoint.

Cascade strategy:
  1. Game exists in DB → full NormalizedGame via GameReadSerializer (django_id filled).
  2. Game absent from DB, found on IGDB → NormalizedGame via igdb_client (django_id=null).
  3. Absent everywhere → 404.
"""

from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game, Rating
from apps.library.models import UserGame

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

IGDB_MOCK_RESPONSE = [
    {
        "id": 99901,
        "name": "IGDB Only Game",
        "summary": "A game only on IGDB",
        "cover": {"url": "//images.igdb.com/t_thumb/abc.jpg"},
        "first_release_date": 1609459200,  # 2021-01-01
        "platforms": [{"id": 6, "name": "PC"}],
        "genres": [{"id": 5, "name": "Shooter"}],
        "collections": [],
        "franchises": [],
    }
]


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameByIgdbIdView:
    def setup_method(self):
        self.url_name = "games:game-by-igdb"

    def _url(self, igdb_id):
        return reverse(self.url_name, kwargs={"igdb_id": igdb_id})

    # -----------------------------------------------------------------------
    # Case 1: Game exists in DB (anonymous)
    # -----------------------------------------------------------------------

    def test_game_in_db_returns_normalized_game(self, api_client, game):
        """A game found in DB returns a NormalizedGame with django_id set."""
        url = self._url(game.igdb_id)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # NormalizedGame contract fields
        assert data["django_id"] == game.id
        assert data["igdb_id"] == game.igdb_id
        assert "name" in data
        assert "summary" in data
        assert "cover_url" in data
        assert "release_date" in data
        assert "platforms" in data
        assert "genres" in data
        assert "user_library" in data
        assert "user_rating" in data

        # For anonymous users, user-specific fields must be null
        assert data["user_library"] is None
        assert data["user_rating"] is None

    # -----------------------------------------------------------------------
    # Case 2: Game exists in DB + authenticated user with library/rating data
    # -----------------------------------------------------------------------

    def test_game_in_db_authenticated_injects_user_data(self, authenticated_api_client, user, game):
        """Authenticated user gets user_library and user_rating injected."""
        # Add game to library
        UserGame.objects.create(user=user, game=game, status="EN_COURS", is_favorite=True)
        # Add a rating
        Rating.objects.create(user=user, game=game, rating_type="sur_10", value=8)

        url = self._url(game.igdb_id)
        response = authenticated_api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        assert data["django_id"] == game.id
        assert data["user_library"] is not None
        assert data["user_library"]["status"] == "EN_COURS"
        assert data["user_library"]["is_favorite"] is True
        assert data["user_rating"] is not None
        assert float(data["user_rating"]["value"]) == 8.0

    # -----------------------------------------------------------------------
    # Case 3: Game NOT in DB, but found on IGDB
    # -----------------------------------------------------------------------

    def test_game_not_in_db_falls_back_to_igdb(self, api_client):
        """If game is absent from DB, fallback to IGDB and return NormalizedGame with django_id=null."""
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            url = self._url(99901)
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        assert data["igdb_id"] == 99901
        assert data["django_id"] is None  # Not in DB
        assert data["name"] == "IGDB Only Game"
        assert data["user_library"] is None
        assert data["user_rating"] is None

        # DB must remain empty — no creation
        assert not Game.objects.filter(igdb_id=99901).exists()

    # -----------------------------------------------------------------------
    # Case 4: Game absent everywhere → 404
    # -----------------------------------------------------------------------

    def test_game_absent_everywhere_returns_404(self, api_client):
        """If the game is not in DB and IGDB returns nothing, respond 404."""
        with patch("apps.games.views.igdb_client.igdb_request", return_value=[]):
            url = self._url(99999)
            response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    # -----------------------------------------------------------------------
    # Case 5: IGDB raises exception → 404 (no 500 leak)
    # -----------------------------------------------------------------------

    def test_igdb_error_returns_404(self, api_client):
        """If IGDB raises an exception and game is not in DB, return 404."""
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=Exception("IGDB unavailable")):
            url = self._url(88888)
            response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
