"""
Tests pour les filtres personnalisés de l'app games (GameFilter).

Ces tests vérifient le filtrage Many-to-Many par genres et plateformes
avec support de valeurs multiples.
"""

import pytest
from rest_framework import status

from apps.games.models import Game, Genre, Platform, Publisher


@pytest.fixture
def genre_action(db):
    """Genre Action"""
    return Genre.objects.create(
        igdb_id=5001,
        nom_genre="Action",
        description="Genre Action",
    )


@pytest.fixture
def genre_rpg(db):
    """Genre RPG"""
    return Genre.objects.create(
        igdb_id=5002,
        nom_genre="RPG",
        description="Genre RPG",
    )


@pytest.fixture
def genre_strategy(db):
    """Genre Strategy"""
    return Genre.objects.create(
        igdb_id=5003,
        nom_genre="Strategy",
        description="Genre Strategy",
    )


@pytest.fixture
def platform_ps5(db):
    """Plateforme PlayStation 5"""
    return Platform.objects.create(
        igdb_id=6001,
        nom_plateforme="PlayStation 5",
        description="Sony PlayStation 5",
    )


@pytest.fixture
def platform_xbox(db):
    """Plateforme Xbox Series X"""
    return Platform.objects.create(
        igdb_id=6002,
        nom_plateforme="Xbox Series X",
        description="Microsoft Xbox Series X",
    )


@pytest.fixture
def platform_pc(db):
    """Plateforme PC"""
    return Platform.objects.create(
        igdb_id=6003,
        nom_plateforme="PC",
        description="Personal Computer",
    )


@pytest.fixture
def publisher_test(db):
    """Publisher générique pour les tests de filtrage"""
    return Publisher.objects.create(
        igdb_id=7001,
        name="Test Publisher",
        description="Publisher de test",
    )


@pytest.fixture
def game_action_ps5(db, publisher_test, genre_action, platform_ps5):
    """Jeu: Action sur PS5"""
    game = Game.objects.create(
        igdb_id=8001,
        name="Action Game PS5",
        description="Jeu d'action exclusif PS5",
        publisher=publisher_test,
    )
    game.genres.add(genre_action)
    game.platforms.add(platform_ps5)
    return game


@pytest.fixture
def game_rpg_multiplatform(db, publisher_test, genre_rpg, platform_ps5, platform_xbox, platform_pc):
    """Jeu: RPG multiplateforme (PS5, Xbox, PC)"""
    game = Game.objects.create(
        igdb_id=8002,
        name="RPG Multiplatform",
        description="RPG disponible sur plusieurs plateformes",
        publisher=publisher_test,
    )
    game.genres.add(genre_rpg)
    game.platforms.add(platform_ps5, platform_xbox, platform_pc)
    return game


@pytest.fixture
def game_action_rpg_pc(db, publisher_test, genre_action, genre_rpg, platform_pc):
    """Jeu: Action-RPG sur PC (deux genres)"""
    game = Game.objects.create(
        igdb_id=8003,
        name="Action-RPG PC",
        description="Jeu hybride Action-RPG sur PC",
        publisher=publisher_test,
    )
    game.genres.add(genre_action, genre_rpg)
    game.platforms.add(platform_pc)
    return game


@pytest.fixture
def game_strategy_xbox(db, publisher_test, genre_strategy, platform_xbox):
    """Jeu: Strategy sur Xbox"""
    game = Game.objects.create(
        igdb_id=8004,
        name="Strategy Xbox",
        description="Jeu de stratégie Xbox exclusif",
        publisher=publisher_test,
    )
    game.genres.add(genre_strategy)
    game.platforms.add(platform_xbox)
    return game


@pytest.mark.django_db
class TestGameFilterByGenre:
    """Tests de filtrage par genre"""

    def test_filter_by_single_genre(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        genre_action,
    ):
        """Filtrer par un seul genre retourne tous les jeux avec ce genre"""
        response = api_client.get(f"/api/games/?genre={genre_action.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_action_ps5, game_action_rpg_pc
        assert len(results) == 2
        game_names = {g["name"] for g in results}
        assert "Action Game PS5" in game_names
        assert "Action-RPG PC" in game_names

    def test_filter_by_multiple_genres(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        genre_action,
        genre_rpg,
    ):
        """Filtrer par plusieurs genres (OR) retourne tous les jeux avec l'un de ces genres"""
        response = api_client.get(f"/api/games/?genre={genre_action.id},{genre_rpg.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_action_ps5, game_rpg_multiplatform, game_action_rpg_pc
        # (tous sauf game_strategy_xbox qui a uniquement Strategy)
        assert len(results) == 3
        game_names = {g["name"] for g in results}
        assert "Action Game PS5" in game_names
        assert "RPG Multiplatform" in game_names
        assert "Action-RPG PC" in game_names

    def test_filter_by_nonexistent_genre(self, api_client):
        """Filtrer par un genre inexistant retourne une liste vide"""
        response = api_client.get("/api/games/?genre=99999")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


@pytest.mark.django_db
class TestGameFilterByPlatform:
    """Tests de filtrage par plateforme"""

    def test_filter_by_single_platform(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        platform_ps5,
    ):
        """Filtrer par une seule plateforme retourne tous les jeux sur cette plateforme"""
        response = api_client.get(f"/api/games/?platform={platform_ps5.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_action_ps5, game_rpg_multiplatform
        assert len(results) == 2
        game_names = {g["name"] for g in results}
        assert "Action Game PS5" in game_names
        assert "RPG Multiplatform" in game_names

    def test_filter_by_multiple_platforms(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        platform_pc,
        platform_xbox,
    ):
        """Filtrer par plusieurs plateformes (OR) retourne tous les jeux sur l'une de ces plateformes"""
        response = api_client.get(f"/api/games/?platform={platform_pc.id},{platform_xbox.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_rpg_multiplatform, game_action_rpg_pc, game_strategy_xbox
        assert len(results) == 3
        game_names = {g["name"] for g in results}
        assert "RPG Multiplatform" in game_names
        assert "Action-RPG PC" in game_names
        assert "Strategy Xbox" in game_names

    def test_filter_by_nonexistent_platform(self, api_client):
        """Filtrer par une plateforme inexistante retourne une liste vide"""
        response = api_client.get("/api/games/?platform=99999")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


@pytest.mark.django_db
class TestGameFilterCombined:
    """Tests de filtrage combiné genre + plateforme"""

    def test_filter_by_genre_and_platform(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        genre_action,
        platform_pc,
    ):
        """Filtrer par genre ET plateforme (AND) retourne les jeux qui matchent les deux"""
        response = api_client.get(f"/api/games/?genre={genre_action.id}&platform={platform_pc.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner uniquement: game_action_rpg_pc
        # (a le genre Action ET est sur PC)
        assert len(results) == 1
        assert results[0]["name"] == "Action-RPG PC"

    def test_filter_by_multiple_genres_and_multiple_platforms(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
        genre_action,
        genre_rpg,
        platform_ps5,
        platform_pc,
    ):
        """Filtrer par plusieurs genres ET plusieurs plateformes"""
        response = api_client.get(f"/api/games/?genre={genre_action.id},{genre_rpg.id}&platform={platform_ps5.id},{platform_pc.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Devrait retourner: game_action_ps5, game_rpg_multiplatform, game_action_rpg_pc
        # - game_action_ps5: Action + PS5 ✓
        # - game_rpg_multiplatform: RPG + PS5 ✓
        # - game_action_rpg_pc: Action + PC ✓
        # - game_strategy_xbox: Strategy + Xbox ✗
        assert len(results) == 3
        game_names = {g["name"] for g in results}
        assert "Action Game PS5" in game_names
        assert "RPG Multiplatform" in game_names
        assert "Action-RPG PC" in game_names

    def test_filter_no_match(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        genre_strategy,
        platform_ps5,
    ):
        """Filtrage qui ne matche aucun jeu retourne une liste vide"""
        # Aucun jeu n'a le genre Strategy ET est sur PS5
        response = api_client.get(f"/api/games/?genre={genre_strategy.id}&platform={platform_ps5.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0


@pytest.mark.django_db
class TestGameFilterNoDuplicates:
    """Tests pour vérifier qu'il n'y a pas de doublons dans les résultats"""

    def test_no_duplicates_with_multiple_genres(
        self,
        api_client,
        game_action_rpg_pc,
        genre_action,
        genre_rpg,
    ):
        """Un jeu avec plusieurs genres ne doit apparaître qu'une fois dans les résultats"""
        # game_action_rpg_pc a les genres Action ET RPG
        # Quand on filtre par Action OU RPG, il ne doit apparaître qu'une fois
        response = api_client.get(f"/api/games/?genre={genre_action.id},{genre_rpg.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Compter combien de fois "Action-RPG PC" apparaît
        game_names = [g["name"] for g in results]
        assert game_names.count("Action-RPG PC") == 1

    def test_no_duplicates_with_multiple_platforms(
        self,
        api_client,
        game_rpg_multiplatform,
        platform_ps5,
        platform_xbox,
        platform_pc,
    ):
        """Un jeu multiplateforme ne doit apparaître qu'une fois dans les résultats"""
        # game_rpg_multiplatform est sur PS5, Xbox ET PC
        # Quand on filtre par PS5 OU Xbox OU PC, il ne doit apparaître qu'une fois
        response = api_client.get(f"/api/games/?platform={platform_ps5.id},{platform_xbox.id},{platform_pc.id}")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]

        # Compter combien de fois "RPG Multiplatform" apparaît
        game_names = [g["name"] for g in results]
        assert game_names.count("RPG Multiplatform") == 1


@pytest.mark.django_db
class TestGameFilterEmptyParams:
    """Tests pour les paramètres vides ou invalides"""

    def test_filter_with_no_params_returns_all(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
    ):
        """Sans paramètres de filtrage, tous les jeux sont retournés"""
        response = api_client.get("/api/games/")

        assert response.status_code == status.HTTP_200_OK
        results = response.data["results"]
        assert len(results) == 4

    def test_filter_with_empty_genre_param(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
    ):
        """Paramètre genre vide est ignoré"""
        response = api_client.get("/api/games/?genre=")

        assert response.status_code == status.HTTP_200_OK
        # Devrait retourner tous les jeux (filtre ignoré)
        assert len(response.data["results"]) >= 2

    def test_filter_with_invalid_genre_id(self, api_client):
        """ID de genre invalide (non numérique) génère une ValueError"""
        # Django-filter lève une ValueError pour des IDs non numériques
        # C'est le comportement attendu - l'API s'attend à des entiers
        with pytest.raises(ValueError, match="Field 'id' expected a number"):
            api_client.get("/api/games/?genre=invalid")


@pytest.mark.django_db
class TestGameFilterSearch:
    """Tests du filtre search (name / name_fr, icontains)."""

    def test_filter_search_matches_name(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        publisher_test,
    ):
        """Sous-chaîne sur le nom anglais."""
        response = api_client.get("/api/games/?search=Multiplatform")

        assert response.status_code == status.HTTP_200_OK
        names = {g["name"] for g in response.data["results"]}
        assert "RPG Multiplatform" in names
        assert "Action Game PS5" not in names

    def test_filter_search_matches_name_fr(
        self,
        api_client,
        publisher_test,
        genre_action,
        platform_pc,
    ):
        """Sous-chaîne sur name_fr lorsque le nom anglais ne matche pas."""
        game = Game.objects.create(
            igdb_id=8100,
            name="Obscure English Title",
            name_fr="Aventure magique",
            description="",
            publisher=publisher_test,
        )
        game.genres.add(genre_action)
        game.platforms.add(platform_pc)

        response = api_client.get("/api/games/?search=magique")

        assert response.status_code == status.HTTP_200_OK
        names = {g["name"] for g in response.data["results"]}
        assert "Aventure magique" in names

    def test_filter_search_whitespace_only_behaves_like_no_filter(
        self,
        api_client,
        game_action_ps5,
        game_rpg_multiplatform,
        game_action_rpg_pc,
        game_strategy_xbox,
    ):
        """search vide ou uniquement des espaces → pas de filtre (retourne tout)."""
        response = api_client.get("/api/games/", {"search": "   "})

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 4
