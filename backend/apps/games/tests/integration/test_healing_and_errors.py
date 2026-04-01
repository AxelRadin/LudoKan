from unittest.mock import patch

import pytest
from django.core.exceptions import ImproperlyConfigured
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game, Publisher
from apps.games.services import get_or_create_game_from_igdb


@pytest.mark.django_db
class TestHealingAndErrorBoundaries:
    def setup_method(self):
        self.publisher, _ = Publisher.objects.get_or_create(name="IGDB")

    # --- 1. Service-level metadata healing (cover_url, release_date) ---
    def test_service_heals_missing_cover_and_date(self):
        igdb_id = 11111
        # Create a stub with only name
        game = Game.objects.create(igdb_id=igdb_id, name="Incomplete Game", publisher=self.publisher)
        assert game.cover_url is None
        assert game.release_date is None

        # Resolve with full data
        get_or_create_game_from_igdb(
            igdb_id=igdb_id, cover_url="https://example.com/new_cover.jpg", release_date="2022-02-22", summary="Now it has a summary too."
        )

        game.refresh_from_db()
        assert game.cover_url == "https://example.com/new_cover.jpg"
        assert str(game.release_date) == "2022-02-22"
        assert game.description == "Now it has a summary too."

    # --- 2. View-level healing via PK (GameViewSet.retrieve) ---
    def test_retrieve_by_pk_triggers_healing(self, api_client):
        igdb_id = 22222
        game = Game.objects.create(igdb_id=igdb_id, name=f"Unknown Game ({igdb_id})", publisher=self.publisher)

        mock_igdb = [
            {
                "id": igdb_id,
                "name": "Healed via PK",
                "summary": "PK Healing summary.",
                "cover": {"url": "//images.igdb.com/t_thumb/pk.jpg"},
                "first_release_date": 1609459200,
                "platforms": [{"id": 6, "name": "PC"}],
                "genres": [{"id": 5, "name": "Shooter"}],
            }
        ]

        url = reverse("games:game-detail", kwargs={"pk": game.id})
        with patch("apps.games.views.igdb_client.igdb_request", return_value=mock_igdb):
            response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        game.refresh_from_db()
        assert game.name == "Healed via PK"
        assert game.description == "PK Healing summary."
        assert game.platforms.count() > 0

    def test_retrieve_by_pk_healing_exception_returns_stub(self, api_client):
        igdb_id = 22223
        game = Game.objects.create(igdb_id=igdb_id, name="Resilient PK Stub", publisher=self.publisher)
        url = reverse("games:game-detail", kwargs={"pk": game.id})
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=Exception("IGDB Failure")):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Resilient PK Stub"

    # --- 3. GameByIgdbIdView Error Boundaries ---
    def test_igdb_improperly_configured_returns_503_or_stub(self, api_client):
        igdb_id = 33333
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})

        # Scenario A: Game NOT in DB + No config -> 503
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=ImproperlyConfigured("Missing keys")):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

        # Scenario B: Game IS in DB as stub + No config -> return stub (healing fails but 200)
        Game.objects.create(igdb_id=igdb_id, name="Emergency Stub", publisher=self.publisher)
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=ImproperlyConfigured("Missing keys")):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Emergency Stub"

    def test_igdb_general_exception_returns_404_or_stub(self, api_client):
        igdb_id = 44444
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})

        # Scenario A: Game NOT in DB + Network Error -> 404 (consistent with existing tests)
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=Exception("Network down")):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Scenario B: Game IS in DB as stub + Network Error -> return stub
        Game.objects.create(igdb_id=igdb_id, name="Resilient Stub", publisher=self.publisher)
        with patch("apps.games.views.igdb_client.igdb_request", side_effect=Exception("Network down")):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Resilient Stub"

    def test_game_by_igdb_id_healing_success(self, api_client):
        igdb_id = 44445
        game = Game.objects.create(igdb_id=igdb_id, name=f"Unknown Game ({igdb_id})", publisher=self.publisher)
        mock_igdb = [
            {
                "id": igdb_id,
                "name": "Healed via IGDB ID",
                "summary": "Healing summary.",
                "cover": {"url": "//images.igdb.com/t_thumb/id.jpg"},
                "first_release_date": 1609459200,
                "platforms": [{"id": 6, "name": "PC"}],
                "genres": [{"id": 5, "name": "Shooter"}],
            }
        ]
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})
        with patch("apps.games.views.igdb_client.igdb_request", return_value=mock_igdb):
            response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        game.refresh_from_db()
        assert game.description == "Healing summary."

    def test_game_by_igdb_id_not_found_on_igdb_but_in_db(self, api_client):
        igdb_id = 44446
        Game.objects.create(igdb_id=igdb_id, name="Existing Stub", publisher=self.publisher)
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})
        with patch("apps.games.views.igdb_client.igdb_request", return_value=[]):
            response = api_client.get(url)
        # Should return the existing stub from DB if IGDB returns nothing
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Existing Stub"

    # --- 4. ImportIgdbGameView Coverage ---
    def test_import_igdb_game_view(self, authenticated_api_client):
        url = reverse("games:game-igdb-import")
        data = {"igdb_id": 55555, "name": "Import View Game", "summary": "Imported via POST"}
        response = authenticated_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "id" in response.data
        assert Game.objects.filter(igdb_id=55555).exists()

    def test_import_igdb_game_view_invalid_data(self, authenticated_api_client):
        url = reverse("games:game-igdb-import")
        # Missing igdb_id
        response = authenticated_api_client.post(url, {"name": "No ID"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "igdb_id is required"
