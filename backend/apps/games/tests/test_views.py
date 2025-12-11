"""
Tests pour les vues de l'app games
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Game, Publisher, Genre, Platform, Rating


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


@pytest.mark.django_db
class TestGameRatings:
    """Tests for creating/updating ratings on games."""

    def test_create_rating_requires_authentication(self, api_client, game):
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "etoiles",
            "value": 4.5,
        }

        response = api_client.post(url, payload, format="json")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_rating_authenticated(self, authenticated_api_client, user, game):
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "etoiles",
            "value": 4.5,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        rating = Rating.objects.get(user=user, game=game)
        assert rating.rating_type == "etoiles"
        assert float(rating.value) == 4.5

    def test_update_existing_rating_authenticated(self, authenticated_api_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type="etoiles",
            value=3,
        )

        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "etoiles",
            "value": 4.5,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        rating.refresh_from_db()
        assert float(rating.value) == 4.5

    def test_invalid_rating_type_returns_400(self, authenticated_api_client, game):
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "invalid_type",
            "value": 5,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_decimal_rating_with_one_decimal(self, authenticated_api_client, user, game):
        """A decimal rating with exactly one decimal place should be accepted."""
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "decimal",
            "value": 7.5,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        rating = Rating.objects.get(user=user, game=game)
        assert rating.rating_type == "decimal"
        assert float(rating.value) == 7.5

    def test_create_decimal_rating_with_two_decimals(self, authenticated_api_client, user, game):
        """A decimal rating with exactly two decimal places should be accepted."""
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "decimal",
            "value": 7.25,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        rating = Rating.objects.get(user=user, game=game)
        assert rating.rating_type == "decimal"
        assert float(rating.value) == 7.25

    def test_create_decimal_rating_without_decimal_is_accepted(self, authenticated_api_client, user, game):
        """A decimal rating without decimal part should be accepted (e.g. 7)."""
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "decimal",
            "value": 7,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        print("response.data",response.data)
        assert response.status_code == status.HTTP_201_CREATED
        rating = Rating.objects.get(user=user, game=game)
        assert rating.rating_type == "decimal"
        assert float(rating.value) == 7.0

    def test_create_decimal_rating_with_three_decimals_is_rejected(self, authenticated_api_client, game):
        """A decimal rating with more than two decimals should be rejected (e.g. 7.123)."""
        url = f"/api/games/{game.id}/ratings/"
        payload = {
            "rating_type": "decimal",
            "value": 7.123,
        }

        response = authenticated_api_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestRatingDetail:
    """Tests for GET/PATCH/DELETE on individual ratings."""

    def test_get_own_rating(self, authenticated_api_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type="etoiles",
            value=4,
        )
        url = f"/api/ratings/{rating.id}/"

        response = authenticated_api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == rating.id
        assert response.data["game"] == game.id
        assert response.data["user"] == user.id

    def test_patch_own_rating(self, authenticated_api_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type="sur_10",
            value=5,
        )
        url = f"/api/ratings/{rating.id}/"
        payload = {
            "rating_type": "sur_10",
            "value": 8,
        }

        response = authenticated_api_client.patch(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        rating.refresh_from_db()
        assert rating.rating_type == "sur_10"
        assert float(rating.value) == 8.0

    def test_delete_own_rating(self, authenticated_api_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type="etoiles",
            value=4,
        )
        url = f"/api/ratings/{rating.id}/"

        response = authenticated_api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Rating.objects.filter(id=rating.id).exists()

    def test_get_nonexistent_rating_returns_404(self, authenticated_api_client):
        url = "/api/ratings/999999/"

        response = authenticated_api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_access_other_user_rating(self, authenticated_api_client, another_user, game):
        other_rating = Rating.objects.create(
            user=another_user,
            game=game,
            rating_type="etoiles",
            value=3,
        )
        url = f"/api/ratings/{other_rating.id}/"

        response = authenticated_api_client.get(url)

        # With queryset filtered by user, this will be 404 (not 403)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestRatingList:
    """Tests for listing ratings with optional filters."""

    def test_list_ratings_filtered_by_game(self, api_client, user, another_user, game, publisher):
        other_game = Game.objects.create(
            igdb_id=5001,
            name="Other Game",
            publisher=publisher,
        )

        Rating.objects.create(
            user=user,
            game=game,
            rating_type="sur_10",
            value=7,
        )
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type="sur_10",
            value=8,
        )
        Rating.objects.create(
            user=user,
            game=other_game,
            rating_type="sur_10",
            value=9,
        )

        url = f"/api/ratings/?game_id={game.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 2

    def test_list_ratings_filtered_by_user(self, api_client, user, another_user, game, publisher):
        other_game = Game.objects.create(
            igdb_id=5002,
            name="Second Game",
            publisher=publisher,
        )

        Rating.objects.create(
            user=user,
            game=game,
            rating_type="sur_10",
            value=6,
        )
        Rating.objects.create(
            user=user,
            game=other_game,
            rating_type="sur_10",
            value=9,
        )
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type="sur_10",
            value=8,
        )

        url = f"/api/ratings/?user_id={user.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 2

    def test_list_ratings_filtered_by_user_and_game(self, api_client, user, another_user, game, publisher):
        other_game = Game.objects.create(
            igdb_id=5003,
            name="Third Game",
            publisher=publisher,
        )

        Rating.objects.create(
            user=user,
            game=game,
            rating_type="sur_10",
            value=6,
        )
        Rating.objects.create(
            user=user,
            game=other_game,
            rating_type="sur_10",
            value=9,
        )
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type="sur_10",
            value=8,
        )

        url = f"/api/ratings/?user_id={user.id}&game_id={game.id}"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        # Only one rating matches both filters
        assert len(response.data["results"]) == 1


@pytest.mark.django_db
class TestGameRatingsAverages:
    """Integration tests for average_rating and rating_count via API."""

    def test_average_rating_and_count_update_with_mixed_rating_types(
        self,
        authenticated_api_client,
        api_client,
        user,
        another_user,
        game,
    ):
        # 1) User (client déjà authentifié) note sur_10 = 8  -> normalized 8
        url = f"/api/games/{game.id}/ratings/"
        payload1 = {
            "rating_type": "sur_10",
            "value": 8,
        }
        response1 = authenticated_api_client.post(url, payload1, format="json")
        assert response1.status_code == status.HTTP_201_CREATED

        game.refresh_from_db()
        assert game.average_rating == pytest.approx(8.0)
        assert game.rating_count == 1

        # 2) another_user note sur_100 = 90 -> normalized 9
        other_client = APIClient()
        other_client.force_authenticate(user=another_user)
        payload2 = {
            "rating_type": "sur_100",
            "value": 90,
        }
        response2 = other_client.post(url, payload2, format="json")
        assert response2.status_code == status.HTTP_201_CREATED

        game.refresh_from_db()
        # Moyenne de 8 et 9 => 8.5
        assert game.average_rating == pytest.approx(8.5)
        assert game.rating_count == 2

        # 3) Vérifier aussi via GET /api/games/{id}/ pour être sûr que le serializer expose bien les valeurs
        detail_response = authenticated_api_client.get(f"/api/games/{game.id}/")
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.data["average_rating"] == pytest.approx(8.5)
        assert detail_response.data["rating_count"] == 2

    def test_average_rating_updates_when_user_updates_rating(
        self,
        authenticated_api_client,
        user,
        another_user,
        game,
    ):
        url = f"/api/games/{game.id}/ratings/"

        # User 1: sur_10 = 8 (normalized 8)
        payload1 = {"rating_type": "sur_10", "value": 8}
        r1 = authenticated_api_client.post(url, payload1, format="json")
        assert r1.status_code == status.HTTP_201_CREATED

        # User 2: etoiles = 5 (normalized 10)
        from rest_framework.test import APIClient
        other_client = APIClient()
        other_client.force_authenticate(user=another_user)
        payload2 = {"rating_type": "etoiles", "value": 5}
        r2 = other_client.post(url, payload2, format="json")
        assert r2.status_code == status.HTTP_201_CREATED

        game.refresh_from_db()
        # Moyenne de 8 et 10 => 9
        assert game.average_rating == pytest.approx(9.0)
        assert game.rating_count == 2

        # User 1 met à jour sa note: sur_10 = 6 (normalized 6)
        payload_update = {"rating_type": "sur_10", "value": 6}
        r3 = authenticated_api_client.post(url, payload_update, format="json")
        assert r3.status_code == status.HTTP_200_OK

        game.refresh_from_db()
        # On a maintenant 6 et 10 => moyenne 8, toujours 2 ratings
        assert game.average_rating == pytest.approx(8.0)
        assert game.rating_count == 2

    def test_average_rating_updates_on_delete_via_api(
        self,
        authenticated_api_client,
        user,
        another_user,
        game,
    ):
        url = f"/api/games/{game.id}/ratings/"

        # Créer deux ratings
        authenticated_api_client.post(url, {"rating_type": "sur_10", "value": 8}, format="json")

        from rest_framework.test import APIClient
        other_client = APIClient()
        other_client.force_authenticate(user=another_user)
        other_client.post(url, {"rating_type": "sur_10", "value": 6}, format="json")

        game.refresh_from_db()
        assert game.average_rating == pytest.approx(7.0)
        assert game.rating_count == 2

        # Récupérer l'id du rating de another_user
        from apps.games.models import Rating
        other_rating = Rating.objects.get(user=another_user, game=game)

        # DELETE /api/ratings/{rating_id}/
        delete_url = f"/api/ratings/{other_rating.id}/"
        response = other_client.delete(delete_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        game.refresh_from_db()
        assert game.average_rating == pytest.approx(8.0)
        assert game.rating_count == 1