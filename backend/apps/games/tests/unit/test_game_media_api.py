import pytest

from apps.games.models import Game, GameScreenshot, GameVideo, Publisher
from apps.games.serializers import GameReadSerializer


@pytest.mark.django_db
class TestGameMediaApi:
    def setup_method(self):
        self.publisher = Publisher.objects.create(name="Test Publisher")
        self.game = Game.objects.create(igdb_id=123, name="Test Game", publisher=self.publisher)

    def test_game_read_serializer_includes_media_when_present(self):
        """Verify that screenshots and videos are correctly serialized."""
        # Create media
        GameScreenshot.objects.create(game=self.game, url="https://example.com/s1.jpg", position=0)
        GameScreenshot.objects.create(game=self.game, url="https://example.com/s2.jpg", position=1)
        GameVideo.objects.create(game=self.game, igdb_id=555, name="Trailer", video_id="abcde")

        serializer = GameReadSerializer(instance=self.game)
        data = serializer.data

        # Verify screenshots
        assert "screenshots" in data
        assert len(data["screenshots"]) == 2
        assert data["screenshots"][0]["url"] == "https://example.com/s1.jpg"
        assert data["screenshots"][1]["url"] == "https://example.com/s2.jpg"

        # Verify videos
        assert "videos" in data
        assert len(data["videos"]) == 1
        assert data["videos"][0]["id"] == 555
        assert data["videos"][0]["name"] == "Trailer"
        assert data["videos"][0]["video_id"] == "abcde"

    def test_game_read_serializer_returns_empty_lists_when_no_media(self):
        """Verify that screenshots and videos are empty lists when not present."""
        serializer = GameReadSerializer(instance=self.game)
        data = serializer.data

        assert "screenshots" in data
        assert data["screenshots"] == []
        assert "videos" in data
        assert data["videos"] == []

    def test_game_read_serializer_sorting_of_screenshots(self):
        """Verify that screenshots are returned in the correct order (by position)."""
        GameScreenshot.objects.create(game=self.game, url="https://example.com/pos1.jpg", position=1)
        GameScreenshot.objects.create(game=self.game, url="https://example.com/pos0.jpg", position=0)

        serializer = GameReadSerializer(instance=self.game)
        data = serializer.data

        assert data["screenshots"][0]["url"] == "https://example.com/pos0.jpg"
        assert data["screenshots"][1]["url"] == "https://example.com/pos1.jpg"
