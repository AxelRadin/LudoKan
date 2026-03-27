"""
Tests unitaires pour vérifier les index de la base de données sur le modèle Game.

Ces tests vérifient que :
1. Les index définis dans le modèle sont correctement créés dans la DB
2. Les migrations d'index ont été appliquées
3. La structure des index correspond aux spécifications
"""

import pytest
from django.db import connection

from apps.games.models import Game


@pytest.mark.django_db
class TestGameDatabaseIndexes:
    """Tests pour vérifier la présence et la structure des index sur Game."""

    def test_game_model_has_meta_indexes(self):
        """Le modèle Game doit avoir des index définis dans Meta.indexes"""
        assert hasattr(Game._meta, "indexes")
        indexes = Game._meta.indexes
        assert len(indexes) == 5, "Game should have exactly 5 custom indexes"

        # Vérifier les noms des index
        index_names = {idx.name for idx in indexes}
        expected_names = {
            "games_min_age_idx",
            "games_min_players_idx",
            "games_max_players_idx",
            "games_popularity_idx",
            "games_age_players_idx",
        }
        assert index_names == expected_names, f"Expected {expected_names}, got {index_names}"

    def test_min_age_index_exists_in_database(self):
        """L'index sur min_age doit être créé dans PostgreSQL"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game' AND indexname = 'games_min_age_idx';
                """)
            result = cursor.fetchone()

        assert result is not None, "Index games_min_age_idx not found in database"
        indexname, indexdef = result
        assert "min_age" in indexdef.lower(), "Index should be on min_age field"

    def test_min_players_index_exists_in_database(self):
        """L'index sur min_players doit être créé dans PostgreSQL"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game' AND indexname = 'games_min_players_idx';
                """)
            result = cursor.fetchone()

        assert result is not None, "Index games_min_players_idx not found in database"
        indexname, indexdef = result
        assert "min_players" in indexdef.lower(), "Index should be on min_players field"

    def test_max_players_index_exists_in_database(self):
        """L'index sur max_players doit être créé dans PostgreSQL"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game' AND indexname = 'games_max_players_idx';
                """)
            result = cursor.fetchone()

        assert result is not None, "Index games_max_players_idx not found in database"
        indexname, indexdef = result
        assert "max_players" in indexdef.lower(), "Index should be on max_players field"

    def test_popularity_index_exists_in_database(self):
        """L'index sur popularity_score (DESC) doit être créé dans PostgreSQL"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game' AND indexname = 'games_popularity_idx';
                """)
            result = cursor.fetchone()

        assert result is not None, "Index games_popularity_idx not found in database"
        indexname, indexdef = result
        assert "popularity_score" in indexdef.lower(), "Index should be on popularity_score field"
        # Vérifier que l'index est DESC
        assert "desc" in indexdef.lower(), "Index should be DESC for popularity_score"

    def test_composite_age_players_index_exists_in_database(self):
        """L'index composite sur (min_age, min_players) doit être créé"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game' AND indexname = 'games_age_players_idx';
                """)
            result = cursor.fetchone()

        assert result is not None, "Index games_age_players_idx not found in database"
        indexname, indexdef = result
        # Vérifier que l'index composite contient les deux champs
        assert "min_age" in indexdef.lower(), "Composite index should include min_age"
        assert "min_players" in indexdef.lower(), "Composite index should include min_players"

    def test_all_custom_indexes_are_btree(self):
        """Tous les index custom doivent être de type B-tree (par défaut)"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game'
                  AND indexname LIKE 'games_%_idx';
                """)
            results = cursor.fetchall()

        assert len(results) == 5, f"Expected 5 custom indexes, found {len(results)}"

        for indexname, indexdef in results:
            # B-tree est le type par défaut (USING btree)
            assert "btree" in indexdef.lower(), f"Index {indexname} should be B-tree type"

    def test_foreign_key_index_exists(self):
        """Django doit créer automatiquement un index sur la FK publisher_id"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game'
                  AND indexdef ILIKE '%publisher_id%';
                """)
            result = cursor.fetchone()

        assert result is not None, "Foreign key index on publisher_id should exist"

    def test_index_names_follow_naming_convention(self):
        """Les noms d'index doivent suivre la convention games_<field>_idx"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'games_game'
                  AND indexname LIKE 'games_%_idx';
                """)
            index_names = [row[0] for row in cursor.fetchall()]

        # Tous les index custom doivent commencer par 'games_' et finir par '_idx'
        for name in index_names:
            assert name.startswith("games_"), f"Index {name} should start with 'games_'"
            assert name.endswith("_idx"), f"Index {name} should end with '_idx'"

    def test_no_duplicate_indexes(self):
        """Il ne doit pas y avoir d'index dupliqués sur les mêmes colonnes"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game'
                ORDER BY indexname;
                """)
            all_indexes = cursor.fetchall()

        # Extraire les définitions d'index (colonnes indexées)
        index_defs = [idx[1] for idx in all_indexes]

        # Vérifier qu'il n'y a pas de doublons exacts
        unique_defs = set(index_defs)
        assert len(index_defs) == len(unique_defs), "Duplicate indexes detected"


@pytest.mark.django_db
class TestGameIndexConfiguration:
    """Tests pour vérifier la configuration des index dans le modèle."""

    def test_min_age_index_configuration(self):
        """L'index min_age doit être configuré correctement"""
        indexes = Game._meta.indexes
        min_age_idx = next((idx for idx in indexes if idx.name == "games_min_age_idx"), None)

        assert min_age_idx is not None, "games_min_age_idx not found in model"
        assert min_age_idx.fields == ["min_age"], "Index should be on min_age field only"

    def test_min_players_index_configuration(self):
        """L'index min_players doit être configuré correctement"""
        indexes = Game._meta.indexes
        min_players_idx = next((idx for idx in indexes if idx.name == "games_min_players_idx"), None)

        assert min_players_idx is not None, "games_min_players_idx not found in model"
        assert min_players_idx.fields == ["min_players"], "Index should be on min_players field only"

    def test_max_players_index_configuration(self):
        """L'index max_players doit être configuré correctement"""
        indexes = Game._meta.indexes
        max_players_idx = next((idx for idx in indexes if idx.name == "games_max_players_idx"), None)

        assert max_players_idx is not None, "games_max_players_idx not found in model"
        assert max_players_idx.fields == ["max_players"], "Index should be on max_players field only"

    def test_popularity_index_configuration(self):
        """L'index popularity_score doit être configuré en DESC"""
        indexes = Game._meta.indexes
        popularity_idx = next((idx for idx in indexes if idx.name == "games_popularity_idx"), None)

        assert popularity_idx is not None, "games_popularity_idx not found in model"
        assert popularity_idx.fields == ["-popularity_score"], "Index should be on -popularity_score (DESC)"

    def test_composite_index_configuration(self):
        """L'index composite doit inclure min_age et min_players dans cet ordre"""
        indexes = Game._meta.indexes
        composite_idx = next((idx for idx in indexes if idx.name == "games_age_players_idx"), None)

        assert composite_idx is not None, "games_age_players_idx not found in model"
        assert composite_idx.fields == ["min_age", "min_players"], "Composite index should have min_age first, then min_players"
