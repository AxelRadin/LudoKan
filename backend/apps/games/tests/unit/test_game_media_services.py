import pytest

from apps.games.services import get_or_create_game_from_igdb

pytestmark = pytest.mark.django_db


def test_media_creation_on_first_import():
    """Verify that screenshots and videos are created on first import."""
    screenshots = [{"url": "https://example.com/s1.jpg", "id": 101}, {"url": "https://example.com/s2.jpg", "id": 102}]
    videos = [{"id": 201, "name": "Trailer 1", "video_id": "vid1"}]

    game, created = get_or_create_game_from_igdb(igdb_id=1234, name="Test Game", screenshots=screenshots, videos=videos)

    assert created is True
    assert game.screenshots.count() == 2
    assert game.screenshots.filter(position=0, url="https://example.com/s1.jpg", igdb_id=101).exists()
    assert game.screenshots.filter(position=1, url="https://example.com/s2.jpg", igdb_id=102).exists()

    assert game.game_videos.count() == 1
    assert game.game_videos.filter(igdb_id=201, name="Trailer 1", video_id="vid1").exists()


def test_media_replacement_on_update():
    """Verify that a second call with different media replaces the previous ones."""
    # First import
    get_or_create_game_from_igdb(igdb_id=1234, screenshots=[{"url": "old_s1"}], videos=[{"id": 1, "video_id": "old_v1"}])

    # Second import with new data
    game, created = get_or_create_game_from_igdb(
        igdb_id=1234, screenshots=[{"url": "new_s1"}, {"url": "new_s2"}], videos=[{"id": 2, "video_id": "new_v1"}]
    )

    assert created is False
    assert game.screenshots.count() == 2
    assert game.screenshots.filter(url="new_s1").exists()
    assert not game.screenshots.filter(url="old_s1").exists()

    assert game.game_videos.count() == 1
    assert game.game_videos.filter(igdb_id=2, video_id="new_v1").exists()
    assert not game.game_videos.filter(id=1).exists()


def test_media_preservation_when_none():
    """Verify that passing None for media preserves existing records."""
    get_or_create_game_from_igdb(igdb_id=1234, screenshots=[{"url": "s1"}], videos=[{"id": 1, "video_id": "v1"}])

    # Call with None
    game, created = get_or_create_game_from_igdb(igdb_id=1234, screenshots=None, videos=None)

    assert game.screenshots.count() == 1
    assert game.game_videos.count() == 1


def test_media_deletion_when_empty_list():
    """Verify that passing an empty list deletes existing media."""
    get_or_create_game_from_igdb(igdb_id=1234, screenshots=[{"url": "s1"}], videos=[{"id": 1, "video_id": "v1"}])

    # Call with []
    game, created = get_or_create_game_from_igdb(igdb_id=1234, screenshots=[], videos=[])

    assert game.screenshots.count() == 0
    assert game.game_videos.count() == 0


def test_regression_existing_calls():
    """Verify that calls without media parameters still work as expected."""
    game, created = get_or_create_game_from_igdb(igdb_id=1234, name="Test Game")

    assert created is True
    assert game.screenshots.count() == 0
    assert game.game_videos.count() == 0
