"""
Tests pour les filtres numériques de l'app games (GameFilter).

Ces tests vérifient le filtrage par min_age, min_players et max_players
avec les opérateurs de comparaison gte/lte.
"""

import pytest
from rest_framework import status

from apps.games.models import Game, Publisher


@pytest.fixture
def publisher_num(db):
    """Publisher générique pour les tests numériques"""
    return Publisher.objects.create(
        igdb_id=9001,
        name="Numeric Publisher",
        description="Publisher de test numérique",
    )


@pytest.fixture
def game_family(db, publisher_num):
    """Jeu familial: min_age=7, min_players=2, max_players=6"""
    return Game.objects.create(
        igdb_id=9101,
        name="Family Game",
        description="Jeu familial pour 2-6 joueurs, dès 7 ans",
        publisher=publisher_num,
        min_age=7,
        min_players=2,
        max_players=6,
    )


@pytest.fixture
def game_teen(db, publisher_num):
    """Jeu ado: min_age=12, min_players=2, max_players=4"""
    return Game.objects.create(
        igdb_id=9102,
        name="Teen Game",
        description="Jeu pour ados, 2-4 joueurs, dès 12 ans",
        publisher=publisher_num,
        min_age=12,
        min_players=2,
        max_players=4,
    )


@pytest.fixture
def game_adult(db, publisher_num):
    """Jeu adulte: min_age=18, min_players=3, max_players=8"""
    return Game.objects.create(
        igdb_id=9103,
        name="Adult Game",
        description="Jeu adulte, 3-8 joueurs, dès 18 ans",
        publisher=publisher_num,
        min_age=18,
        min_players=3,
        max_players=8,
    )


@pytest.fixture
def game_solo(db, publisher_num):
    """Jeu solo: min_age=10, min_players=1, max_players=1"""
    return Game.objects.create(
        igdb_id=9104,
        name="Solo Game",
        description="Jeu solo uniquement, dès 10 ans",
        publisher=publisher_num,
        min_age=10,
        min_players=1,
        max_players=1,
    )


@pytest.fixture
def game_no_age(db, publisher_num):
    """Jeu sans restriction d'âge: min_age=None"""
    return Game.objects.create(
        igdb_id=9105,
        name="No Age Game",
        description="Jeu sans âge minimum",
        publisher=publisher_num,
        min_age=None,
        min_players=2,
        max_players=4,
    )


@pytest.mark.django_db
class TestGameFilterByMinAge:
    """Tests de filtrage par âge minimum (min_age__gte)"""

    def test_filter_min_age_returns_games_for_age_and_above(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """min_age=12 retourne les jeux avec min_age >= 12"""
        response = api_client.get("/api/games/?min_age=12")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_teen (12), game_adult (18)
        # game_family (7) et game_solo (10) sont exclus
        assert len(results) == 2
        game_names = {g["name"] for g in results}
        assert "Teen Game" in game_names
        assert "Adult Game" in game_names

    def test_filter_min_age_excludes_younger_games(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
    ):
        """min_age=18 retourne uniquement les jeux pour 18 ans et +"""
        response = api_client.get("/api/games/?min_age=18")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        assert len(results) == 1
        assert results[0]["name"] == "Adult Game"

    def test_filter_min_age_low_value_returns_most_games(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """min_age=7 retourne tous les jeux avec min_age >= 7"""
        response = api_client.get("/api/games/?min_age=7")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_family (7), game_teen (12), game_adult (18), game_solo (10)
        assert len(results) == 4

    def test_filter_min_age_excludes_null_values(
        self,
        api_client,
        game_no_age,
        game_teen,
    ):
        """Les jeux avec min_age=None sont exclus du filtrage par âge"""
        response = api_client.get("/api/games/?min_age=10")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        game_names = {g["name"] for g in results}

        # game_no_age (None) ne doit pas apparaître
        assert "No Age Game" not in game_names
        assert "Teen Game" in game_names

    def test_filter_min_age_no_match(self, api_client, game_family, game_teen, game_adult):
        """min_age=99 ne retourne aucun jeu"""
        response = api_client.get("/api/games/?min_age=99")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


@pytest.mark.django_db
class TestGameFilterByMinPlayers:
    """Tests de filtrage par nombre minimum de joueurs (min_players__lte)"""

    def test_filter_min_players_returns_games_playable_with_n_players(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """min_players=2 retourne les jeux jouables à 2 (min_players <= 2)"""
        response = api_client.get("/api/games/?min_players=2")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_family (min=2), game_teen (min=2), game_solo (min=1) sont jouables à 2
        # game_adult (min=3) requiert 3 joueurs → exclu
        assert len(results) == 3
        game_names = {g["name"] for g in results}
        assert "Family Game" in game_names
        assert "Teen Game" in game_names
        assert "Solo Game" in game_names
        assert "Adult Game" not in game_names

    def test_filter_min_players_1_returns_solo_games(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """min_players=1 retourne uniquement les jeux jouables en solo"""
        response = api_client.get("/api/games/?min_players=1")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        assert len(results) == 1
        assert results[0]["name"] == "Solo Game"

    def test_filter_min_players_large_value_returns_all(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """min_players=3 retourne les jeux dont min_players <= 3"""
        response = api_client.get("/api/games/?min_players=3")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_family (2), game_teen (2), game_solo (1), game_adult (3)
        assert len(results) == 4


@pytest.mark.django_db
class TestGameFilterByMaxPlayers:
    """Tests de filtrage par nombre maximum de joueurs (max_players__gte)"""

    def test_filter_max_players_returns_games_supporting_n_players(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """max_players=6 retourne les jeux acceptant 6+ joueurs"""
        response = api_client.get("/api/games/?max_players=6")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_family (max=6), game_adult (max=8) acceptent 6+ joueurs
        # game_teen (max=4) et game_solo (max=1) sont exclus
        assert len(results) == 2
        game_names = {g["name"] for g in results}
        assert "Family Game" in game_names
        assert "Adult Game" in game_names

    def test_filter_max_players_1_returns_solo_only(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """max_players=1 retourne uniquement les jeux solo"""
        response = api_client.get("/api/games/?max_players=1")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        assert len(results) == 4  # tous ont max_players >= 1

    def test_filter_max_players_8_returns_all(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """max_players=8 retourne uniquement le jeu adulte"""
        response = api_client.get("/api/games/?max_players=8")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        assert len(results) == 1
        assert results[0]["name"] == "Adult Game"

    def test_filter_max_players_no_match(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """max_players=99 ne retourne aucun jeu"""
        response = api_client.get("/api/games/?max_players=99")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


@pytest.mark.django_db
class TestGameFilterNumericCombined:
    """Tests de filtrage combiné avec filtres numériques"""

    def test_filter_min_age_and_min_players(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """?min_age=12&min_players=2 — jeux pour 12+ ans ET jouables à 2"""
        response = api_client.get("/api/games/?min_age=12&min_players=2")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_teen: min_age=12 ✓, min_players=2 ✓
        # game_adult: min_age=18 ✓, min_players=3 > 2 ✗
        assert len(results) == 1
        assert results[0]["name"] == "Teen Game"

    def test_filter_all_numeric_combined(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """?min_age=10&min_players=2&max_players=6 — combinaison des 3 filtres"""
        response = api_client.get("/api/games/?min_age=10&min_players=2&max_players=6")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # game_teen: min_age=12>=10 ✓, min_players=2<=2 ✓, max_players=4>=6 ✗
        # game_adult: min_age=18>=10 ✓, min_players=3<=2 ✗, max_players=8>=6 ✓
        # game_solo: min_age=10>=10 ✓, min_players=1<=2 ✓, max_players=1>=6 ✗
        # game_family: min_age=7>=10 ✗
        assert len(results) == 0

    def test_filter_numeric_and_genre(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
    ):
        """Filtrage numérique combiné avec genre (AND entre types)"""
        from apps.games.models import Genre

        genre_action = Genre.objects.create(igdb_id=9901, name="Action", description="")
        game_teen.genres.add(genre_action)

        response = api_client.get(f"/api/games/?min_age=12&genre={genre_action.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Seul game_teen a le genre Action ET min_age >= 12
        assert len(results) == 1
        assert results[0]["name"] == "Teen Game"

    def test_filter_numeric_no_params_returns_all(
        self,
        api_client,
        game_family,
        game_teen,
        game_adult,
        game_solo,
    ):
        """Sans paramètres numériques, tous les jeux sont retournés"""
        response = api_client.get("/api/games/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 4
