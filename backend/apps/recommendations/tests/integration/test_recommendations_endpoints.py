"""
Tests d'intégration de base pour l'app recommendations.

"""

import pytest
from rest_framework import status

from apps.games.models import Game, GameScreenshot, Genre
from apps.library.models import UserGame


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
