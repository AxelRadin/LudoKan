import pytest
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game


@pytest.mark.django_db
class TestIgdbResolveView:
    def setup_method(self):
        self.url = reverse("games:game-resolve-from-igdb")

    def test_resolve_new_game(self, authenticated_api_client):
        """Vérifie la création d'un nouveau jeu via la route de résolution (authentifié)."""
        payload = {
            "igdb_id": 99999,
            "name": "New Awesome Game",
            "cover_url": "https://example.com/cover.jpg",
            "release_date": "2024-01-01",
        }

        response = authenticated_api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["created"] is True
        assert data["game_id"] is not None
        assert data["normalized_game"]["igdb_id"] == 99999
        assert data["normalized_game"]["name"] == "New Awesome Game"

        # Vérification en base
        assert Game.objects.filter(igdb_id=99999).exists()

    def test_resolve_existing_game(self, authenticated_api_client, game):
        """Vérifie que la route renvoie le jeu existant sans le recréer."""
        payload = {
            "igdb_id": game.igdb_id,
            "name": "Different Name",
        }

        response = authenticated_api_client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["created"] is False
        assert data["game_id"] == game.id

    def test_resolve_missing_igdb_id(self, authenticated_api_client):
        """Vérifie qu'une erreur 400 est renvoyée si igdb_id manque."""
        payload = {"name": "No ID Game"}
        response = authenticated_api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_resolve_invalid_date(self, authenticated_api_client):
        """Vérifie le comportement avec une date malformée."""
        payload = {"igdb_id": 123, "release_date": "invalid-date"}
        response = authenticated_api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_resolve_anonymous_fails(self, api_client):
        """Vérifie que l'accès anonyme est refusé (401)."""
        payload = {"igdb_id": 12345}
        response = api_client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
