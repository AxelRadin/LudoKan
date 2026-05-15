import pytest
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status


@pytest.mark.django_db
class TestIgdbPlatformsView:
    def test_get_platforms_success(self, api_client, monkeypatch):
        # Clear cache first
        cache.delete("igdb:platforms:all")

        fake_platforms = [
            {"id": 1, "name": "PC"},
            {"id": 2, "name": "PS5"},
        ]

        def mock_igdb_request(endpoint, query):
            assert endpoint == "platforms"
            assert "fields name" in query
            return fake_platforms

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb_request,
        )

        response = api_client.get("/api/igdb/platforms/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == fake_platforms

        # Verify it's cached
        cached_data = cache.get("igdb:platforms:all")
        assert cached_data == fake_platforms

    def test_get_platforms_from_cache(self, api_client, monkeypatch):
        fake_platforms = [{"id": 3, "name": "Xbox"}]
        cache.set("igdb:platforms:all", fake_platforms)

        # We don't mock igdb_request, if it's called it will fail or we can mock it to raise error
        def mock_fail(endpoint, query):
            pytest.fail("Should not call IGDB when cached")

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_fail,
        )

        response = api_client.get("/api/igdb/platforms/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == fake_platforms

    def test_get_platforms_igdb_unavailable(self, api_client, monkeypatch):
        cache.delete("igdb:platforms:all")

        def mock_raise(endpoint, query):
            raise ImproperlyConfigured("IGDB error 401")

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_raise,
        )

        response = api_client.get("/api/igdb/platforms/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_get_platforms_generic_error(self, api_client, monkeypatch):
        cache.delete("igdb:platforms:all")

        def mock_raise(endpoint, query):
            raise RuntimeError("Unknown error")

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_raise,
        )

        response = api_client.get("/api/igdb/platforms/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "error" in response.data
        assert "Unknown error" in response.data["details"]

    def test_get_platforms_invalid_data_format(self, api_client, monkeypatch):
        cache.delete("igdb:platforms:all")

        def mock_igdb_request(endpoint, query):
            return {"not": "a list"}

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb_request,
        )

        response = api_client.get("/api/igdb/platforms/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []
