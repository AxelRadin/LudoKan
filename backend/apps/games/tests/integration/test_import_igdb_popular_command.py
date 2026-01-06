import pytest
from django.core.management import call_command

from apps.games.management.commands import import_igdb_popular as cmd_module
from apps.games.models import Game, Genre, Platform, Publisher


@pytest.mark.django_db
def test_import_igdb_popular_creates_games_and_relations(monkeypatch):
    """
    Vérifie que la commande import_igdb_popular :
    - appelle bien igdb_request pour genres, plateformes et jeux
    - crée / met à jour les Genre, Platform, Publisher et Game
    - relie correctement les relations M2M et quelques champs calculés.
    """

    state = {
        "genres_called": False,
        "platforms_called": False,
        "games_called": False,
        "involved_called": False,
        "companies_called": False,
        "covers_called": False,
        "age_ratings_called": False,
        "multiplayer_called": False,
    }

    fake_game = {
        "id": 1,
        "name": "Fake IGDB Game",
        "summary": "Description du jeu IGDB.",
        "first_release_date": 1_700_000_000,  # timestamp arbitraire
        "game_status": 0,  # → "released"
        "genres": [10],
        "platforms": [20],
        "involved_companies": [100],
        "age_ratings": [200],
        "multiplayer_modes": [300],
        "cover": 400,
    }

    def fake_igdb_request(endpoint: str, query: str):
        # Genres : un seul batch puis fin
        if endpoint == "genres":
            if state["genres_called"]:
                return []
            state["genres_called"] = True
            return [
                {"id": 10, "name": "Action"},
            ]

        # Plateformes : un seul batch puis fin
        if endpoint == "platforms":
            if state["platforms_called"]:
                return []
            state["platforms_called"] = True
            return [
                {"id": 20, "name": "PC"},
            ]

        # Jeux : un batch avec un seul jeu
        if endpoint == "games":
            if state["games_called"]:
                return []
            state["games_called"] = True
            return [fake_game]

        # Involved companies
        if endpoint == "involved_companies":
            state["involved_called"] = True
            return [
                {
                    "id": 100,
                    "game": 1,
                    "company": 500,
                    "developer": False,
                    "publisher": True,
                },
            ]

        # Companies (publishers)
        if endpoint == "companies":
            state["companies_called"] = True
            return [
                {
                    "id": 500,
                    "name": "Fake Publisher",
                    "description": "Un éditeur de test.",
                },
            ]

        # Covers
        if endpoint == "covers":
            state["covers_called"] = True
            return [
                {
                    "id": 400,
                    "url": "//images.igdb.com/igdb/image/upload/t_cover_big/fake_cover.jpg",
                    "image_id": "fake_cover",
                },
            ]

        # Age ratings (PEGI 16 par ex.)
        if endpoint == "age_ratings":
            state["age_ratings_called"] = True
            return [
                {
                    "id": 200,
                    "category": 2,  # PEGI
                    "rating": 4,  # mappé à 16 ans dans compute_min_age
                },
            ]

        # Multiplayer modes
        if endpoint == "multiplayer_modes":
            state["multiplayer_called"] = True
            return [
                {
                    "id": 300,
                    "game": 1,
                    "offlinemax": 4,
                    "onlinemax": 8,
                    "offlinecoopmax": 2,
                    "onlinecoopmax": 4,
                    "offlinecoop": True,
                    "onlinecoop": False,
                    "campaigncoop": False,
                },
            ]

        pytest.fail(f"Endpoint IGDB inattendu dans le fake_igdb_request: {endpoint}")

    # On monkeypatch l'appel réseau pour ne jamais toucher l'API réelle
    monkeypatch.setattr(cmd_module, "igdb_request", fake_igdb_request)

    # Sanity check avant exécution : pas d'objets pré-existants
    assert Genre.objects.count() == 0
    assert Platform.objects.count() == 0
    assert Publisher.objects.count() == 0
    assert Game.objects.count() == 0

    # Exécuter la commande avec un petit limit pour le test
    call_command("import_igdb_popular", limit=10, from_year=2020)

    # Vérifier que les appels IGDB attendus ont bien eu lieu
    assert state["genres_called"]
    assert state["platforms_called"]
    assert state["games_called"]
    assert state["involved_called"]
    assert state["companies_called"]
    assert state["covers_called"]
    assert state["age_ratings_called"]
    assert state["multiplayer_called"]

    # Vérifier la création / mise à jour des entités de base
    genre = Genre.objects.get(igdb_id=10)
    assert genre.nom_genre == "Action"

    platform = Platform.objects.get(igdb_id=20)
    assert platform.nom_plateforme == "PC"

    publisher = Publisher.objects.get(igdb_id=500)
    assert publisher.name == "Fake Publisher"

    game = Game.objects.get(igdb_id=1)
    assert game.name == "Fake IGDB Game"
    assert game.publisher == publisher

    # Relations M2M
    assert list(game.genres.values_list("igdb_id", flat=True)) == [10]
    assert list(game.platforms.values_list("igdb_id", flat=True)) == [20]

    # Champs calculés / dérivés
    assert game.status == "released"  # map_status(0)
    assert game.cover_url.startswith("https://images.igdb.com/")
    assert game.min_age == 16  # mappé depuis PEGI (rating=4)
    assert game.min_players == 2  # coop détecté
    assert game.max_players == 8  # max des valeurs de modes
