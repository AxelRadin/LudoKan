import pytest
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game


@pytest.mark.django_db
class TestGameMediaEndpoints:
    def setup_method(self):
        self.url = reverse("games:game-resolve-from-igdb")

    def test_resolve_game_with_media_persists_successfully(self, authenticated_api_client):
        """Verify that screenshots and videos in the payload are persisted."""
        igdb_id = 12345
        data = {
            "igdb_id": igdb_id,
            "name": "Media Test Game",
            "screenshots": [{"url": "https://example.com/s1.jpg", "id": 101}, {"url": "https://example.com/s2.jpg", "id": 102}],
            "videos": [{"id": 201, "name": "Trailer 1", "video_id": "vid1"}],
        }

        response = authenticated_api_client.post(self.url, data, format="json")
        assert response.status_code == status.HTTP_200_OK

        game = Game.objects.get(igdb_id=igdb_id)

        # Verify screenshots
        assert game.screenshots.count() == 2
        assert game.screenshots.filter(url="https://example.com/s1.jpg", position=0, igdb_id=101).exists()
        assert game.screenshots.filter(url="https://example.com/s2.jpg", position=1, igdb_id=102).exists()

        # Verify videos
        assert game.game_videos.count() == 1
        assert game.game_videos.filter(igdb_id=201, name="Trailer 1", video_id="vid1").exists()

    def test_resolve_game_with_empty_media_clears_existing(self, authenticated_api_client):
        """Verify that passing empty lists via API clears existing media."""
        igdb_id = 12345
        # Initial import with media
        initial_data = {
            "igdb_id": igdb_id,
            "name": "Media Test Game",
            "screenshots": [{"url": "https://example.com/s1.jpg"}],
            "videos": [{"id": 201, "video_id": "vid1"}],
        }
        authenticated_api_client.post(self.url, initial_data, format="json")

        game = Game.objects.get(igdb_id=igdb_id)
        assert game.screenshots.count() == 1
        assert game.game_videos.count() == 1

        # Update with empty lists
        clear_data = {"igdb_id": igdb_id, "screenshots": [], "videos": []}
        response = authenticated_api_client.post(self.url, clear_data, format="json")
        assert response.status_code == status.HTTP_200_OK

        game.refresh_from_db()
        assert game.screenshots.count() == 0
        assert game.game_videos.count() == 0

    def test_import_endpoint_persists_media(self, authenticated_api_client):
        """Verify the explicit import endpoint also persists media."""
        import_url = reverse("games:game-igdb-import")
        igdb_id = 99988
        data = {
            "igdb_id": igdb_id,
            "name": "Import Test",
            "screenshots": [{"url": "https://example.com/import_s1.jpg"}],
            "videos": [{"id": 303, "video_id": "import_v1"}],
        }

        response = authenticated_api_client.post(import_url, data, format="json")
        assert response.status_code == status.HTTP_200_OK

        game = Game.objects.get(igdb_id=igdb_id)
        assert game.screenshots.filter(url="https://example.com/import_s1.jpg").exists()
        assert game.game_videos.filter(igdb_id=303).exists()
