"""
Tests pour les vues de l'app games
"""

import pytest
from rest_framework import status

from apps.games.models import Game, Publisher, Genre, Platform


# ---------------------------------------------------------------------------
# Tests CRUD pour Game
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameCRUD:
    """Tests pour le CRUD du modèle Game via l'API"""

    def test_list_games_anonymous_ok(self, api_client, game):
        """Un utilisateur anonyme peut lister les jeux (read-only)."""
        response = api_client.get("/api/games/")

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1

    def test_retrieve_game_anonymous_ok(self, api_client, game, publisher, genre, platform):
        """Un utilisateur anonyme peut consulter le détail d'un jeu."""
        url = f"/api/games/{game.id}/"

        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == game.id
        assert response.data["publisher"]["id"] == publisher.id
        assert response.data["genres"][0]["id"] == genre.id
        assert response.data["platforms"][0]["id"] == platform.id

    def test_create_game_requires_authentication(self, api_client, publisher, genre, platform):
        """La création de jeu doit être protégée (auth requise)."""
        payload = {
            "igdb_id": 999999,
            "name": "Space Adventures",
            "description": "Un nouveau jeu de test.",
            "publisher": publisher.id,
            "genres": [genre.id],
            "platforms": [platform.id],
        }

        response = api_client.post("/api/games/", payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_game_authenticated(self, authenticated_api_client, publisher, genre, platform):
        """Un utilisateur authentifié peut créer un jeu."""
        payload = {
            "igdb_id": 888888,
            "name": "New Auth Game",
            "description": "Créé par un utilisateur authentifié.",
            "publisher": publisher.id,
            "genres": [genre.id],
            "platforms": [platform.id],
        }

        response = authenticated_api_client.post("/api/games/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Game.objects.filter(name="New Auth Game").exists()

    def test_update_game_authenticated_put(self, authenticated_api_client, game, genre, platform, publisher):
        """Mise à jour complète d'un jeu avec PUT."""
        url = f"/api/games/{game.id}/"
        payload = {
            "igdb_id": game.igdb_id,
            "name": "Updated Game PUT",
            "description": "Description mise à jour.",
            "publisher": publisher.id,
            "genres": [genre.id],
            "platforms": [platform.id],
            "status": "released",
            "min_players": 1,
            "max_players": 4,
            "min_age": 12,
        }

        response = authenticated_api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        game.refresh_from_db()
        assert game.name == "Updated Game PUT"
        assert game.status == "released"

    def test_partial_update_game_authenticated_patch(self, authenticated_api_client, game):
        """Mise à jour partielle d'un jeu avec PATCH."""
        url = f"/api/games/{game.id}/"
        payload = {
            "name": "Updated Game PATCH",
        }

        response = authenticated_api_client.patch(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        game.refresh_from_db()
        assert game.name == "Updated Game PATCH"

    def test_delete_game_authenticated(self, authenticated_api_client, game):
        """Suppression d'un jeu par un utilisateur authentifié."""
        url = f"/api/games/{game.id}/"

        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Game.objects.filter(id=game.id).exists()


# ---------------------------------------------------------------------------
# Tests CRUD pour Publisher
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublisherCRUD:
    """Tests pour le CRUD de Publisher via l'API"""

    def test_list_publishers_anonymous_ok(self, api_client, publisher):
        response = api_client.get("/api/publishers/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_create_publisher_requires_authentication(self, api_client):
        payload = {
            "igdb_id": 123456,
            "name": "Unauthorized Publisher",
        }

        response = api_client.post("/api/publishers/", payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_publisher_authenticated(self, authenticated_api_client):
        payload = {
            "igdb_id": 555555,
            "name": "Auth Publisher",
            "description": "Créé via l'API.",
            "website": "https://auth-publisher.example.com",
        }

        response = authenticated_api_client.post("/api/publishers/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Publisher.objects.filter(name="Auth Publisher").exists()

    def test_update_publisher(self, authenticated_api_client, publisher):
        url = f"/api/publishers/{publisher.id}/"
        payload = {
            "igdb_id": publisher.igdb_id,
            "name": "Updated Publisher",
            "description": "Description mise à jour.",
            "website": publisher.website,
        }

        response = authenticated_api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        publisher.refresh_from_db()
        assert publisher.name == "Updated Publisher"

    def test_delete_publisher(self, authenticated_api_client, publisher):
        url = f"/api/publishers/{publisher.id}/"

        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Publisher.objects.filter(id=publisher.id).exists()


# ---------------------------------------------------------------------------
# Tests CRUD pour Genre
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGenreCRUD:
    """Tests pour le CRUD de Genre via l'API"""

    def test_list_genres_anonymous_ok(self, api_client, genre):
        response = api_client.get("/api/genres/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_create_genre_requires_authentication(self, api_client):
        payload = {
            "igdb_id": 7777,
            "nom_genre": "Unauthorized Genre",
        }

        response = api_client.post("/api/genres/", payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_genre_authenticated(self, authenticated_api_client):
        payload = {
            "igdb_id": 8888,
            "nom_genre": "Auth Genre",
            "description": "Genre créé via l'API.",
        }

        response = authenticated_api_client.post("/api/genres/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Genre.objects.filter(nom_genre="Auth Genre").exists()

    def test_update_genre(self, authenticated_api_client, genre):
        url = f"/api/genres/{genre.id}/"
        payload = {
            "igdb_id": genre.igdb_id,
            "nom_genre": "Updated Genre",
            "description": "Description mise à jour.",
        }

        response = authenticated_api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        genre.refresh_from_db()
        assert genre.nom_genre == "Updated Genre"

    def test_delete_genre(self, authenticated_api_client, genre):
        url = f"/api/genres/{genre.id}/"

        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Genre.objects.filter(id=genre.id).exists()


# ---------------------------------------------------------------------------
# Tests CRUD pour Platform
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPlatformCRUD:
    """Tests pour le CRUD de Platform via l'API"""

    def test_list_platforms_anonymous_ok(self, api_client, platform):
        response = api_client.get("/api/platforms/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_create_platform_requires_authentication(self, api_client):
        payload = {
            "igdb_id": 9999,
            "nom_plateforme": "Unauthorized Platform",
        }

        response = api_client.post("/api/platforms/", payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_platform_authenticated(self, authenticated_api_client):
        payload = {
            "igdb_id": 1010,
            "nom_plateforme": "Auth Platform",
            "description": "Plateforme créée via l'API.",
        }

        response = authenticated_api_client.post("/api/platforms/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Platform.objects.filter(nom_plateforme="Auth Platform").exists()

    def test_update_platform(self, authenticated_api_client, platform):
        url = f"/api/platforms/{platform.id}/"
        payload = {
            "igdb_id": platform.igdb_id,
            "nom_plateforme": "Updated Platform",
            "description": "Description mise à jour.",
        }

        response = authenticated_api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        platform.refresh_from_db()
        assert platform.nom_plateforme == "Updated Platform"

    def test_delete_platform(self, authenticated_api_client, platform):
        url = f"/api/platforms/{platform.id}/"

        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Platform.objects.filter(id=platform.id).exists()

