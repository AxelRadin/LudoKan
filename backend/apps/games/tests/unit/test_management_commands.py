"""
Tests unitaires pour les management commands liés à la performance.

Ces tests vérifient que :
1. La commande check_indexes s'exécute sans erreur
2. La commande test_query_performance s'exécute sans erreur
3. Les commandes produisent des outputs attendus
"""

from io import StringIO

import pytest
from django.core.management import call_command


@pytest.mark.django_db
class TestCheckIndexesCommand:
    """Tests pour la commande check_indexes."""

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
