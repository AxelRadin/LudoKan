import pytest
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game


@pytest.mark.django_db
class TestIgdbResolveView:
    def setup_method(self):
        self.url = reverse("games:game-resolve-from-igdb")

    def test_anonymous_user_cannot_resolve(self, api_client):
        """Resolution requires authentication."""
        data = {"igdb_id": 12345, "name": "Test Game"}
        response = api_client.post(self.url, data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_resolve_new_game_creates_record(self, authenticated_api_client):
        """First call creates a new Game record."""
        igdb_id = 12345
        data = {"igdb_id": igdb_id, "name": "New IGDB Game", "cover_url": "https://example.com/cover.jpg", "release_date": "2023-01-01"}

        assert not Game.objects.filter(igdb_id=igdb_id).exists()

        response = authenticated_api_client.post(self.url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] is True
        assert response.data["game_id"] is not None

        # Verify DB
        game = Game.objects.get(igdb_id=igdb_id)
        assert game.name == "New IGDB Game"
        assert str(game.release_date) == "2023-01-01"
        assert response.data["game_id"] == game.id

    def test_resolve_existing_game_is_idempotent(self, authenticated_api_client, game):
        """Second call returns existing record and sets created=False."""
        data = {"igdb_id": game.igdb_id, "name": game.name}

        # Call 1 (already exists via fixture)
        response = authenticated_api_client.post(self.url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] is False
        assert response.data["game_id"] == game.id

        # Call 2 (idempotency check)
        response2 = authenticated_api_client.post(self.url, data)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["created"] is False
        assert response2.data["game_id"] == game.id

    def test_resolve_missing_required_fields_error(self, authenticated_api_client):
        """Missing igdb_id returns 400."""
        data = {"name": "Missing ID"}
        response = authenticated_api_client.post(self.url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "igdb_id" in response.data["errors"]

    def test_resolve_response_structure(self, authenticated_api_client):
        """Verify the full NormalizedGame structure is returned."""
        data = {"igdb_id": 54321, "name": "Structure Test"}
        response = authenticated_api_client.post(self.url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "game_id" in response.data
        assert "created" in response.data
        assert "normalized_game" in response.data

        norm = response.data["normalized_game"]
        expected_keys = {"django_id", "igdb_id", "name", "summary", "cover_url", "release_date", "platforms", "genres", "user_library", "user_rating"}
        assert expected_keys.issubset(norm.keys())
        assert norm["django_id"] == response.data["game_id"]
        assert norm["igdb_id"] == 54321

    def test_resolve_with_partial_data_works(self, authenticated_api_client):
        """Only igdb_id is strictly required."""
        data = {"igdb_id": 999}
        response = authenticated_api_client.post(self.url, data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["created"] is True
        game = Game.objects.get(igdb_id=999)
        # Service uses "Unknown Game (999)" as default name
        assert game.name == "Unknown Game (999)"
