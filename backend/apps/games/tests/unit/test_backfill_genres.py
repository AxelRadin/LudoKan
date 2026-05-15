"""Tests unitaires pour la commande management backfill_genres."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from apps.games.models import Game, Publisher


@pytest.fixture
def publisher():
    return Publisher.objects.create(name="Test Publisher")


@pytest.fixture
def game_without_genres(publisher):
    return Game.objects.create(
        name="No Genre Game",
        igdb_id=123,
        publisher=publisher,
    )


@pytest.mark.django_db
class TestBackfillGenresCommand:
    def test_backfill_no_games(self):
        """Test qu'un message de succès est affiché si aucun jeu ne correspond."""
        out = StringIO()
        call_command("backfill_genres", stdout=out)
        assert "No games to process." in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_success(self, mock_igdb_request, game_without_genres):
        """Test standard de mise à jour des genres avec succès."""
        # Simulation de retour IGDB
        mock_igdb_request.return_value = [
            {
                "id": 123,
                "genres": [{"id": 1, "name": "Action"}],
            }
        ]

        out = StringIO()
        call_command("backfill_genres", stdout=out)

        output = out.getvalue()
        assert "Processing 1 games missing genres..." in output
        assert "IGDB 123: genres updated." in output
        assert "Done. Processed: 1, Updated: 1, Errors: 0" in output

        game_without_genres.refresh_from_db()
        assert game_without_genres.genres.count() == 1
        assert game_without_genres.genres.first().name == "Action"

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_all_option(self, mock_igdb_request, game_without_genres):
        """Test l'option --all qui traite tous les jeux même s'ils ont déjà des genres."""
        mock_igdb_request.return_value = [{"id": 123}]

        out = StringIO()
        call_command("backfill_genres", "--all", stdout=out)
        assert "Processing 1 all games..." in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_dry_run(self, mock_igdb_request, game_without_genres):
        """Test l'option --dry-run : on ne modifie pas la base."""
        mock_igdb_request.return_value = [
            {
                "id": 123,
                "genres": [{"id": 1, "name": "Action"}],
            }
        ]

        out = StringIO()
        call_command("backfill_genres", "--dry-run", stdout=out)

        output = out.getvalue()
        assert "[DRY-RUN] IGDB 123: would set genres [Action]" in output

        game_without_genres.refresh_from_db()
        assert game_without_genres.genres.count() == 0

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_no_genres_returned(self, mock_igdb_request, game_without_genres):
        """Test le cas où IGDB ne renvoie aucun genre pour le jeu."""
        mock_igdb_request.return_value = [{"id": 123, "genres": []}]

        out = StringIO()
        call_command("backfill_genres", stdout=out)
        assert "IGDB 123: no genres returned, skipping." in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_api_error(self, mock_igdb_request, game_without_genres):
        """Test la gestion des erreurs API IGDB."""
        mock_igdb_request.side_effect = Exception("API Error")

        out = StringIO()
        call_command("backfill_genres", stdout=out)
        assert "Chunk error: API Error" in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_upsert_error(self, mock_igdb_request, game_without_genres):
        """Test la gestion des erreurs lors de la mise à jour en base locale."""
        mock_igdb_request.return_value = [{"id": 123, "genres": [{"id": 1, "name": "Action"}]}]

        with patch("apps.games.management.commands.backfill_genres.get_or_create_game_from_igdb", side_effect=Exception("DB Error")):
            out = StringIO()
            call_command("backfill_genres", stdout=out)
            assert "IGDB 123: error — DB Error" in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_limit(self, mock_igdb_request, game_without_genres, publisher):
        """Test l'option --limit qui limite le nombre de jeux à traiter."""
        # Créer un deuxième jeu pour tester la limite
        Game.objects.create(name="Second Game", igdb_id=456, publisher=publisher)

        mock_igdb_request.return_value = [{"id": 123}]

        out = StringIO()
        # On a 2 jeux éligibles, on en demande 1
        call_command("backfill_genres", "--limit=1", stdout=out)
        assert "Processing 1 games missing genres..." in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_unexpected_response(self, mock_igdb_request, game_without_genres):
        """Test le cas où IGDB ne renvoie pas une liste."""
        mock_igdb_request.return_value = {"error": "wrong format"}

        out = StringIO()
        call_command("backfill_genres", stdout=out)
        assert "Unexpected IGDB response: <class 'dict'>" in out.getvalue()

    @patch("apps.games.management.commands.backfill_genres.igdb_client.igdb_request")
    def test_backfill_game_no_id(self, mock_igdb_request, game_without_genres):
        """Test le cas où un jeu dans la réponse IGDB n'a pas d'ID."""
        mock_igdb_request.return_value = [{"name": "No ID"}]

        out = StringIO()
        call_command("backfill_genres", stdout=out)
        # Ne devrait rien afficher de spécifique mais terminer sans erreur
        assert "Done. Processed: 0, Updated: 0, Errors: 0" in out.getvalue()
