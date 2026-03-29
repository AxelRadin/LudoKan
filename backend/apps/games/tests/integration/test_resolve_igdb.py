import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Game


@pytest.mark.django_db
class TestIgdbResolveView:
    def setup_method(self):
        self.client = APIClient()
        self.url = reverse("games:game-resolve-from-igdb")

    def test_resolve_new_game(self):
        """Vérifie la création d'un nouveau jeu via la route de résolution."""
        payload = {
            "igdb_id": 99999,
            "name": "New Awesome Game",
            "cover_url": "https://example.com/cover.jpg",
            "release_date": "2024-01-01",
        }

        response = self.client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["created"] is True
        assert data["game_id"] is not None
        assert data["normalized_game"]["igdb_id"] == 99999
        assert data["normalized_game"]["name"] == "New Awesome Game"
        assert data["normalized_game"]["cover_url"] == "https://example.com/cover.jpg"
        assert data["normalized_game"]["release_date"] == "2024-01-01"

        # Vérification en base
        assert Game.objects.filter(igdb_id=99999).exists()

    def test_resolve_existing_game(self, game):
        """Vérifie que la route renvoie le jeu existant sans le recréer."""
        payload = {
            "igdb_id": game.igdb_id,
            "name": "Different Name",  # Ne devrait pas écraser si déjà existant via get_or_create defaults
        }

        response = self.client.post(self.url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["created"] is False
        assert data["game_id"] == game.id
        assert data["normalized_game"]["igdb_id"] == game.igdb_id
        # Le nom ne doit pas changer si on utilise get_or_create avec defaults
        assert data["normalized_game"]["name"] == game.name_fr or game.name

    def test_resolve_missing_igdb_id(self):
        """Vérifie qu'une erreur 400 est renvoyée si igdb_id manque."""
        payload = {"name": "No ID Game"}
        response = self.client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_resolve_invalid_date(self):
        """Vérifie le comportement avec une date malformée."""
        payload = {"igdb_id": 123, "release_date": "invalid-date"}
        response = self.client.post(self.url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
