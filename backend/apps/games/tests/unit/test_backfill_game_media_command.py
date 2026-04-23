"""Tests unitaires pour la commande management backfill_game_media."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from apps.games.models import Game, Publisher


@pytest.fixture
def publisher():
    return Publisher.objects.create(name="Test Publisher")


@pytest.fixture
def game_with_igdb(publisher):
    return Game.objects.create(
        name="Test Game",
        igdb_id=123,
        publisher=publisher,
        popularity_score=10.0,
    )


@pytest.fixture
def game_without_igdb(publisher):
    return Game.objects.create(
        name="Local Game",
        publisher=publisher,
    )


@pytest.mark.django_db
def test_backfill_no_games():
    """Test qu'un message d'avertissement est affiché si aucun jeu ne correspond."""
    out = StringIO()
    call_command("backfill_game_media", stdout=out)
    assert "No games found matching criteria." in out.getvalue()


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_success(mock_igdb_request, game_with_igdb):
    """Test standard de mise à jour avec succès."""
    # Simulation de retour IGDB
    mock_igdb_request.return_value = [
        {
            "id": 123,
            "screenshots": [{"id": 1, "url": "url", "image_id": "test_id"}],
            "videos": [{"id": 456, "video_id": "youtube_id", "name": "Trailer"}],
        }
    ]

    out = StringIO()
    call_command("backfill_game_media", stdout=out)

    output = out.getvalue()
    assert "Preparing to process 1 games..." in output
    assert "Successfully synced media for IGDB ID 123" in output
    assert "Finished backfill. Processed: 1, Success: 1, Errors: 0" in output

    game_with_igdb.refresh_from_db()
    assert game_with_igdb.screenshots.count() == 1
    assert game_with_igdb.game_videos.count() == 1


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_dry_run(mock_igdb_request, game_with_igdb):
    """Test avec l'option --dry-run : on ne modifie pas la DB."""
    mock_igdb_request.return_value = [
        {
            "id": 123,
            "screenshots": [{"id": 1, "url": "url", "image_id": "test_id"}],
        }
    ]

    out = StringIO()
    call_command("backfill_game_media", "--dry-run", stdout=out)

    output = out.getvalue()
    assert "[DRY-RUN] Target IGDB ID 123: Found 1 screens, 0 videos." in output

    game_with_igdb.refresh_from_db()
    assert game_with_igdb.screenshots.count() == 0


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_specific_game_id(mock_igdb_request, game_with_igdb):
    """Test le filtrage par --game-id."""
    mock_igdb_request.return_value = [{"id": 123}]

    out = StringIO()
    call_command("backfill_game_media", f"--game-id={game_with_igdb.id}", stdout=out)

    output = out.getvalue()
    assert "Preparing to process 1 games..." in output


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_api_error(mock_igdb_request, game_with_igdb):
    """Test la résilience en cas d'erreur de l'API."""
    mock_igdb_request.side_effect = Exception("API Offline")

    out = StringIO()
    call_command("backfill_game_media", stdout=out)

    output = out.getvalue()
    assert "Chunk error: API Offline" in output
    assert "Errors: 0" in output


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_limit(mock_igdb_request, game_with_igdb):
    """Test le filtrage par --limit."""
    mock_igdb_request.return_value = [{"id": 123}]
    out = StringIO()
    call_command("backfill_game_media", "--limit=1", stdout=out)
    assert "Preparing to process 1 games..." in out.getvalue()


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_specific_igdb_id(mock_igdb_request, game_with_igdb):
    """Test le filtrage par --igdb-id."""
    mock_igdb_request.return_value = [{"id": 123}]
    out = StringIO()
    call_command("backfill_game_media", f"--igdb-id={game_with_igdb.igdb_id}", stdout=out)
    assert "Preparing to process 1 games..." in out.getvalue()


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_db_sync_error(mock_igdb_request, game_with_igdb):
    """Test l'erreur lors de la persistance en base locale."""
    mock_igdb_request.return_value = [{"id": 123, "screenshots": [{"id": 1, "url": "url", "image_id": "test_id"}]}]

    with patch("apps.games.management.commands.backfill_game_media.get_or_create_game_from_igdb", side_effect=Exception("DB Error")):
        out = StringIO()
        call_command("backfill_game_media", stdout=out)

        output = out.getvalue()
        assert "Error for IGDB ID 123: DB Error" in output
        assert "Errors: 1" in output


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_igdb_not_list(mock_igdb_request, game_with_igdb):
    """Test le cas où l'API ne renvoie pas une liste."""
    mock_igdb_request.return_value = {"error": "Not a list"}

    out = StringIO()
    call_command("backfill_game_media", stdout=out)

    output = out.getvalue()
    assert "Expected list from IGDB, got <class 'dict'>" in output


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_game_media.igdb_client.igdb_request")
def test_backfill_igdb_game_no_id(mock_igdb_request, game_with_igdb):
    """Test le cas où un jeu IGDB n'a pas de champ id."""
    mock_igdb_request.return_value = [{"name": "No ID Game"}, {"id": 123}]

    out = StringIO()
    call_command("backfill_game_media", stdout=out)

    output = out.getvalue()
    assert "Ignoring IGDB ID 123 (No media found)" in output
