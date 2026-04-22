"""
Tests unitaires pour les management commands liés à la performance.

Ces tests vérifient que :
1. La commande check_indexes s'exécute sans erreur
2. La commande test_query_performance s'exécute sans erreur
3. Les commandes produisent des outputs attendus
"""

from io import StringIO
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command


@pytest.mark.django_db
class TestCheckIndexesCommand:
    """Tests pour la commande check_indexes."""

    def test_check_indexes_when_no_indexes_found(self):
        """Quand la table n'a aucun index, la commande affiche un warning et sort proprement (lignes 32-33)."""
        out = StringIO()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        with patch("apps.games.management.commands.check_indexes.connection") as mock_conn:
            mock_conn.cursor.return_value = mock_cursor
            call_command("check_indexes", stdout=out)
        output = out.getvalue()
        assert "No indexes found on games_game table" in output

    def test_check_indexes_command_runs_without_error(self):
        """La commande check_indexes doit s'exécuter sans erreur"""
        out = StringIO()
        # Ne doit pas lever d'exception
        call_command("check_indexes", stdout=out)
        output = out.getvalue()

        # Vérifier que la sortie contient des informations sur les index
        assert "Database Indexes on games_game Table" in output
        assert "Total indexes:" in output

    def test_check_indexes_lists_custom_indexes(self):
        """La commande doit lister les 5 index custom créés"""
        out = StringIO()
        call_command("check_indexes", stdout=out)
        output = out.getvalue()

        # Vérifier que les 5 index custom sont présents
        assert "games_min_age_idx" in output
        assert "games_min_players_idx" in output
        assert "games_max_players_idx" in output
        assert "games_popularity_idx" in output
        assert "games_age_players_idx" in output

    def test_check_indexes_shows_index_definitions(self):
        """La commande doit afficher les définitions SQL des index"""
        out = StringIO()
        call_command("check_indexes", stdout=out)
        output = out.getvalue()

        # Vérifier que les définitions SQL contiennent CREATE INDEX
        assert "CREATE INDEX" in output
        # Vérifier que les noms de champs sont présents
        assert "min_age" in output
        assert "min_players" in output
        assert "max_players" in output
        assert "popularity_score" in output


@pytest.mark.django_db
class TestQueryPerformanceCommand:
    """Tests pour la commande test_query_performance."""

    def test_query_performance_command_runs_without_error(self):
        """La commande test_query_performance doit s'exécuter sans erreur"""
        out = StringIO()
        # Ne doit pas lever d'exception
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        # Vérifier que la sortie contient le titre
        assert "Testing Query Performance with EXPLAIN" in output
        assert "Performance Testing Complete" in output

    def test_query_performance_tests_min_age_filter(self):
        """La commande doit tester le filtre min_age"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Filter by min_age >= 12" in output
        assert "Results:" in output

    def test_query_performance_tests_min_players_filter(self):
        """La commande doit tester le filtre min_players"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Filter by min_players <= 2" in output

    def test_query_performance_tests_max_players_filter(self):
        """La commande doit tester le filtre max_players"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Filter by max_players >= 4" in output

    def test_query_performance_tests_combined_filters(self):
        """La commande doit tester les filtres combinés"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Combined min_age >= 12 AND min_players <= 2" in output

    def test_query_performance_tests_m2m_with_numeric(self):
        """La commande doit tester les filtres M2M + numériques"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Filter by genre ID 1 AND min_age >= 12" in output

    def test_query_performance_tests_ordering(self):
        """La commande doit tester le tri par popularité"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        assert "Order by -popularity_score" in output

    def test_query_performance_shows_query_plans(self):
        """La commande doit afficher les plans de requêtes EXPLAIN"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        # Les plans de requêtes doivent contenir des informations SQL
        assert "Query Plan:" in output or "SQL Query:" in output

    def test_query_performance_shows_index_usage_hints(self):
        """La commande doit afficher des indications sur l'usage des index"""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()

        # Doit mentionner Index Scan ou Seq Scan
        assert "Index Scan" in output or "Seq Scan" in output

    def test_query_performance_with_mocked_index_scan(self):
        """Force le passage dans la branche 'Index Scan' (ligne 82) via un mock."""
        out = StringIO()
        mock_cursor = MagicMock()
        # On simule un output EXPLAIN avec un Index Scan
        mock_cursor.fetchall.return_value = [["Index Scan on games_game_min_age_idx"]]
        mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
        mock_cursor.__exit__ = MagicMock(return_value=False)

        with patch("apps.games.management.commands.test_query_performance.connection") as mock_conn:
            mock_conn.cursor.return_value = mock_cursor
            call_command("test_query_performance", stdout=out)

        output = out.getvalue()
        # Vérifie que le symbole ✓ (style.SUCCESS) est présent dans l'output
        assert "✓" in output
        assert "Index Scan" in output

    def test_query_performance_runs_publisher_branch_when_game_exists(self, game):
        """Couvre la branche first_pub is not None (filtre par publisher, lignes 63-64)."""
        out = StringIO()
        call_command("test_query_performance", stdout=out)
        output = out.getvalue()
        assert "Filter by publisher_id =" in output
