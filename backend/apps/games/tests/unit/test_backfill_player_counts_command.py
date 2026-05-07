"""Tests unitaires pour la commande backfill_player_counts."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from apps.games.models import Game, Publisher


@pytest.fixture
def publisher():
    return Publisher.objects.create(name="Backfill Publisher")


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_player_counts.time.sleep", return_value=None)
@patch("apps.games.management.commands.backfill_player_counts.get_or_create_game_from_igdb")
@patch("apps.games.management.commands.backfill_player_counts.enrich_with_wikidata_display_name")
@patch("apps.games.management.commands.backfill_player_counts.igdb_client.igdb_request")
def test_backfill_player_counts_success_and_skip(
    mock_igdb_request,
    mock_enrich,
    mock_get_or_create,
    _mock_sleep,
    publisher,
):
    """Met a jour les jeux avec data IGDB et skip ceux sans min/max."""
    Game.objects.create(name="Needs Backfill", igdb_id=111, publisher=publisher, max_players=None)
    Game.objects.create(name="Also Needs Backfill", igdb_id=222, publisher=publisher, max_players=None)

    mock_igdb_request.return_value = [{"id": 111}, {"id": 222}]
    mock_enrich.return_value = [
        {"igdb_id": 111, "min_players": 1, "max_players": 4},
        {"igdb_id": 222, "min_players": None, "max_players": None},
    ]

    out = StringIO()
    err = StringIO()
    call_command("backfill_player_counts", "--batch=50", "--delay=0", stdout=out, stderr=err)

    output = out.getvalue()
    assert "Found 2 games without player count data." in output
    assert "2/2..." in output
    assert "Done. Updated: 1, no IGDB data: 1." in output

    # batch est cappé à 10 dans la commande
    sent_query = mock_igdb_request.call_args[0][1]
    assert "limit 10;" in sent_query
    assert "where id = (111,222);" in sent_query
    mock_get_or_create.assert_called_once_with(igdb_id=111, min_players=1, max_players=4)


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_player_counts.time.sleep", return_value=None)
@patch("apps.games.management.commands.backfill_player_counts.get_or_create_game_from_igdb")
@patch("apps.games.management.commands.backfill_player_counts.enrich_with_wikidata_display_name")
@patch("apps.games.management.commands.backfill_player_counts.igdb_client.igdb_request")
def test_backfill_player_counts_handles_batch_errors(
    mock_igdb_request,
    _mock_enrich,
    mock_get_or_create,
    _mock_sleep,
    publisher,
):
    """Une erreur IGDB sur un lot est loggée et la commande continue."""
    Game.objects.create(name="Needs Backfill", igdb_id=333, publisher=publisher, max_players=None)

    mock_igdb_request.side_effect = RuntimeError("IGDB down")

    out = StringIO()
    err = StringIO()
    call_command("backfill_player_counts", "--delay=0", stdout=out, stderr=err)

    assert "Error on batch [333]: IGDB down" in err.getvalue()
    assert "Done. Updated: 0, no IGDB data: 0." in out.getvalue()
    mock_get_or_create.assert_not_called()


@pytest.mark.django_db
@patch("apps.games.management.commands.backfill_player_counts.time.sleep", return_value=None)
@patch("apps.games.management.commands.backfill_player_counts.get_or_create_game_from_igdb")
@patch("apps.games.management.commands.backfill_player_counts.enrich_with_wikidata_display_name")
@patch("apps.games.management.commands.backfill_player_counts.igdb_client.igdb_request")
def test_backfill_player_counts_respects_limit(
    mock_igdb_request,
    mock_enrich,
    _mock_get_or_create,
    _mock_sleep,
    publisher,
):
    """Le paramètre --limit borne le nombre de jeux traités."""
    Game.objects.create(name="A", igdb_id=901, publisher=publisher, max_players=None)
    Game.objects.create(name="B", igdb_id=902, publisher=publisher, max_players=None)

    mock_igdb_request.return_value = [{"id": 901}]
    mock_enrich.return_value = [{"igdb_id": 901, "min_players": None, "max_players": None}]

    out = StringIO()
    call_command("backfill_player_counts", "--limit=1", "--delay=0", stdout=out)
    assert "Found 1 games without player count data." in out.getvalue()
