"""Tests unitaires pour la commande management import_igdb_popular."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command


@pytest.mark.django_db
class TestImportIgdbPopularCommand:
    @patch("apps.games.management.commands.import_igdb_popular.Command.import_genres")
    @patch("apps.games.management.commands.import_igdb_popular.Command.import_platforms")
    @patch("apps.games.management.commands.import_igdb_popular.Command.import_games_and_publishers")
    def test_import_with_skip_meta(self, mock_import_games, mock_import_platforms, mock_import_genres):
        """Test l'option --skip-meta qui doit ignorer l'import des genres et plateformes."""
        out = StringIO()
        call_command("import_igdb_popular", "--skip-meta", stdout=out)

        output = out.getvalue()
        assert "(--skip-meta : import genres/plateformes ignoré)" in output

        # Vérifie que les méthodes d'import meta n'ont pas été appelées
        mock_import_genres.assert_not_called()
        mock_import_platforms.assert_not_called()
        # Mais que l'import des jeux a bien été appelé
        mock_import_games.assert_called_once()

    @patch("apps.games.management.commands.import_igdb_popular.Command.import_genres")
    @patch("apps.games.management.commands.import_igdb_popular.Command.import_platforms")
    @patch("apps.games.management.commands.import_igdb_popular.Command.import_games_and_publishers")
    def test_import_without_skip_meta(self, mock_import_games, mock_import_platforms, mock_import_genres):
        """Test standard sans --skip-meta (comportement par défaut)."""
        out = StringIO()
        call_command("import_igdb_popular", stdout=out)

        output = out.getvalue()
        assert "(--skip-meta : import genres/plateformes ignoré)" not in output

        mock_import_genres.assert_called_once()
        mock_import_platforms.assert_called_once()
        mock_import_games.assert_called_once()
