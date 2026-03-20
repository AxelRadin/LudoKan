"""
Tests d'intégration pour le proxy IGDB (api/igdb/...).
On mock igdb_client.igdb_request et igdb_wikidata pour ne pas appeler les APIs externes.
"""

import pytest
from rest_framework import status


@pytest.mark.django_db
class TestIgdbProxySearch:
    """Tests pour GET /api/igdb/search/"""

    def test_search_missing_q_returns_400(self, api_client):
        response = api_client.get("/api/igdb/search/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_search_with_q_returns_200_and_list(self, api_client, monkeypatch):
        fake_games = [
            {"id": 100, "name": "The Legend of Zelda", "total_rating_count": 500},
        ]

        def mock_igdb_request(endpoint, query):
            return fake_games

        def mock_enrich(games):
            return [{**g, "display_name": g.get("name"), "name_fr": None, "name_en": g.get("name")} for g in games]

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb_request,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            mock_enrich,
        )

        response = api_client.get("/api/igdb/search/", {"q": "zelda"})
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
        assert response.data[0]["id"] == 100
        assert response.data[0]["name"] == "The Legend of Zelda"
