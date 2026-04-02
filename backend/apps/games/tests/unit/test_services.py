from datetime import date

import pytest

from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb

pytestmark = pytest.mark.django_db


def test_get_or_create_game_from_igdb_creates_new_game():
    """Verify that a new game gets created successfully with the provided arguments."""
    game, created = get_or_create_game_from_igdb(
        igdb_id=1234,
        name="Test Game",
        cover_url="https://example.com/cover.jpg",
        release_date=date(2023, 1, 1),
    )

    assert created is True
    assert game.igdb_id == 1234
    assert game.name == "Test Game"
    assert game.cover_url == "https://example.com/cover.jpg"
    assert game.release_date == date(2023, 1, 1)

    # Assert publisher is created/accessed
    assert game.publisher.name == "IGDB"

    assert Game.objects.count() == 1


def test_get_or_create_game_from_igdb_is_idempotent():
    """Verify that calling the service twice with the same igdb_id doesn't create a new instance."""
    game1, created1 = get_or_create_game_from_igdb(
        igdb_id=5678,
        name="Original Name",
    )

    game2, created2 = get_or_create_game_from_igdb(
        igdb_id=5678,
        name="Different Name",  # Should be ignored because the game already exists
    )

    assert created1 is True
    assert created2 is False
    assert game1.id == game2.id
    assert game1.name == "Original Name"
    assert game2.name == "Original Name"  # It shouldn't overwrite existing db record
    assert Game.objects.count() == 1


def test_get_or_create_game_from_igdb_fallback_name():
    """Verify that the service handles missing names securely."""
    game, created = get_or_create_game_from_igdb(
        igdb_id=9999,
        # Intentionally omitting name
    )

    assert created is True
    assert game.igdb_id == 9999
    assert "Unknown Game" in game.name
    assert str(9999) in game.name
