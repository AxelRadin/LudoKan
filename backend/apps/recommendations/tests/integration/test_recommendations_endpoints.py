"""
Tests d'intégration de base pour l'app recommendations.

"""

import pytest
from rest_framework import status

from apps.games.models import Game, GameScreenshot, Genre
from apps.library.models import UserGame
from apps.recommendations.serializers import RecommendedGameSerializer


@pytest.mark.django_db
class TestRecommendationsEndpoints:
    def test_get_recommendations(self, api_client, user, publisher, monkeypatch):
        # Mock IGDB request
        def fake_igdb_request(endpoint, query):
            return [
                {
                    "id": 456,
                    "name": "Recommended",
                    "total_rating_count": 100,
                    "cover": {"url": "//images.igdb.com/cover.jpg"},
                    "screenshots": [{"url": "//images.igdb.com/shot.jpg"}],
                    "genres": [{"id": 4, "name": "Action"}],
                }
            ]

        monkeypatch.setattr("apps.recommendations.views.igdb_request", fake_igdb_request)

        # Authentification
        api_client.force_authenticate(user=user)

        # Setup
        genre = Genre.objects.create(name="Action", igdb_id=4)  # 4 = Action on IGDB

        # Jeu déjà possédé (ne devrait pas être recommandé)
        owned_game = Game.objects.create(name="Owned", publisher=publisher, popularity_score=100, igdb_id=123)
        owned_game.genres.add(genre)
        UserGame.objects.create(user=user, game=owned_game)

        # Jeu recommandé (possède le genre, >= 4 screenshots, non possédé)
        rec_game = Game.objects.create(name="Recommended", publisher=publisher, popularity_score=50, igdb_id=456)
        rec_game.genres.add(genre)
        for i in range(4):
            GameScreenshot.objects.create(game=rec_game, url=f"http://example.com/shot{i}.jpg", position=i)

        # Jeu ignoré (pas assez de screenshots)
        ignored_game = Game.objects.create(name="Ignored", publisher=publisher, popularity_score=80)
        ignored_game.genres.add(genre)
        GameScreenshot.objects.create(game=ignored_game, url="http://example.com/shot.jpg", position=0)

        response = api_client.get("/api/recommendations/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Doit contenir rec_game mais pas owned_game ni ignored_game
        assert len(data) == 1
        assert data[0]["id"] == rec_game.id
        assert data[0]["name"] == "Recommended"

    def test_get_recommendations_unauthenticated(self, api_client):
        response = api_client.get("/api/recommendations/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_recommendations_no_genres(self, api_client, user):
        """Couvre la ligne 28 : utilisateur sans poids de genres."""
        api_client.force_authenticate(user=user)
        response = api_client.get("/api/recommendations/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_get_recommendations_no_igdb_genres(self, api_client, user, publisher):
        """Couvre la ligne 42 : utilisateur avec genres locaux mais aucun n'a d'ID IGDB."""
        api_client.force_authenticate(user=user)
        # Créer un genre local sans igdb_id
        genre = Genre.objects.create(name="Local Only", igdb_id=None)
        game = Game.objects.create(name="Local Game", publisher=publisher, igdb_id=123)
        game.genres.add(genre)
        # Créer une entrée en bibliothèque pour générer des poids
        UserGame.objects.create(user=user, game=game)

        response = api_client.get("/api/recommendations/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_get_recommendations_api_not_list(self, api_client, user, publisher, monkeypatch):
        """Couvre la ligne 62 : cas où l'API IGDB ne renvoie pas une liste."""
        api_client.force_authenticate(user=user)

        # Setup pour avoir des genres avec IGDB IDs
        genre = Genre.objects.create(name="Action", igdb_id=4)
        game = Game.objects.create(name="Game", publisher=publisher, igdb_id=456)
        game.genres.add(genre)
        UserGame.objects.create(user=user, game=game)

        # Mock renvoyant un dict au lieu d'une liste
        monkeypatch.setattr("apps.recommendations.views.igdb_request", lambda e, q: {"error": "bad request"})

        response = api_client.get("/api/recommendations/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_serializer_coverage(self):
        """Couvre les lignes 1-3 de serializers.py en vérifiant sa définition."""
        from apps.games.serializers import GameReadSerializer

        assert RecommendedGameSerializer == GameReadSerializer
