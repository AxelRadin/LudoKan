import pytest
from django.db import IntegrityError

from apps.games.models import GameScreenshot, GameVideo


@pytest.mark.django_db
class TestGameScreenshotModel:
    """Tests pour le modèle GameScreenshot"""

    def test_create_screenshot(self, game):
        screenshot = GameScreenshot.objects.create(game=game, url="https://example.com/image.jpg", position=0, igdb_id=12345)
        assert screenshot.id is not None
        assert screenshot.game == game
        assert screenshot.url == "https://example.com/image.jpg"
        assert screenshot.position == 0
        assert screenshot.igdb_id == 12345
        assert str(screenshot) == f"Screenshot for {game.name} at position 0"

    def test_screenshot_cascade_delete(self, game):
        GameScreenshot.objects.create(game=game, url="https://example.com/image.jpg", position=0)
        assert GameScreenshot.objects.filter(game=game).count() == 1
        game.delete()
        assert GameScreenshot.objects.count() == 0

    def test_screenshot_ordering(self, game):
        s2 = GameScreenshot.objects.create(game=game, url="url2", position=1)
        s1 = GameScreenshot.objects.create(game=game, url="url1", position=0)
        s3 = GameScreenshot.objects.create(game=game, url="url3", position=2)

        screenshots = list(GameScreenshot.objects.all())
        assert screenshots[0] == s1
        assert screenshots[1] == s2
        assert screenshots[2] == s3


@pytest.mark.django_db
class TestGameVideoModel:
    """Tests pour le modèle GameVideo"""

    def test_create_video(self, game):
        video = GameVideo.objects.create(game=game, igdb_id=159026, name="Trailer", video_id="dQw4w9WgXcQ")
        assert video.id is not None
        assert video.game == game
        assert video.igdb_id == 159026
        assert video.name == "Trailer"
        assert video.video_id == "dQw4w9WgXcQ"
        assert str(video) == f"Video dQw4w9WgXcQ for {game.name}"

    def test_video_cascade_delete(self, game):
        GameVideo.objects.create(game=game, igdb_id=159026, video_id="vid1")
        assert GameVideo.objects.filter(game=game).count() == 1
        game.delete()
        assert GameVideo.objects.count() == 0

    def test_video_unique_constraint(self, game):
        GameVideo.objects.create(game=game, igdb_id=159026, video_id="vid1")
        with pytest.raises(IntegrityError):
            GameVideo.objects.create(game=game, igdb_id=159026, video_id="vid2")
