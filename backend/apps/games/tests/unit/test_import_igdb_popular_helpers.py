import datetime

import pytest

from apps.games.management.commands.import_igdb_popular import Command
from apps.games.models import Game, Genre, Platform, Publisher


def make_command():
    """Instancie la commande sans passer par call_command."""
    return Command()


@pytest.mark.django_db
def test_import_genres_handles_pagination_and_no_more_data(monkeypatch):
    cmd = make_command()

    call_count = {"genres": 0}

    def fake_igdb_request(endpoint, query):
        if endpoint == "genres":
            call_count["genres"] += 1
            if call_count["genres"] == 1:
                return [{"id": i, "name": f"Genre {i}"} for i in range(500)]
            return []
        return []

    monkeypatch.setattr("apps.games.management.commands.import_igdb_popular.igdb_request", fake_igdb_request)

    cmd.import_genres()

    assert Genre.objects.count() == 500


@pytest.mark.django_db
def test_import_platforms_handles_pagination_and_no_more_data(monkeypatch):
    cmd = make_command()

    call_count = {"platforms": 0}

    def fake_igdb_request(endpoint, query):
        if endpoint == "platforms":
            call_count["platforms"] += 1
            if call_count["platforms"] == 1:
                return [{"id": i, "name": f"Platform {i}"} for i in range(500)]
            return []
        return []

    monkeypatch.setattr("apps.games.management.commands.import_igdb_popular.igdb_request", fake_igdb_request)

    cmd.import_platforms()

    assert Platform.objects.count() == 500


@pytest.mark.django_db
def test_import_games_and_publishers_handles_no_games(monkeypatch):
    cmd = make_command()

    def fake_igdb_request(endpoint, query):
        if endpoint == "games":
            return []
        return []

    monkeypatch.setattr("apps.games.management.commands.import_igdb_popular.igdb_request", fake_igdb_request)

    cmd.import_games_and_publishers(limit=10, from_year=2020)

    assert Game.objects.count() == 0


def test_fetch_helpers_return_empty_structures_when_no_ids():
    cmd = make_command()

    assert cmd.fetch_involved_companies([]) == {}
    assert cmd.fetch_companies([]) == {}
    assert cmd.fetch_covers([]) == {}
    assert cmd.fetch_age_ratings([]) == {}
    assert cmd.fetch_multiplayer_modes([]) == []


def test_map_status_handles_none_and_unknown():
    cmd = make_command()

    assert cmd.map_status(None) is None
    assert cmd.map_status(999) is None
    assert cmd.map_status(0) == "released"


def test_compute_cover_url_various_cases():
    cmd = make_command()

    # Pas de cover
    assert cmd._compute_cover_url({}, {}) is None

    # Cover id mais pas dans la map
    assert cmd._compute_cover_url({"cover": 1}, {}) is None

    # Cover sans url
    assert cmd._compute_cover_url({"cover": 1}, {1: {}}) is None

    # Cover avec url vide
    assert cmd._compute_cover_url({"cover": 1}, {1: {"url": ""}}) is None

    # URL sans protocole
    game_data = {"cover": 1}
    covers_map = {1: {"url": "//images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg"}}
    assert cmd._compute_cover_url(game_data, covers_map).startswith("https://")

    # URL déjà complète
    covers_map = {1: {"url": "https://cdn.example.com/cover.jpg"}}
    assert cmd._compute_cover_url(game_data, covers_map) == "https://cdn.example.com/cover.jpg"


def test_index_multiplayer_by_game_skips_missing_game_id():
    cmd = make_command()

    mp_list = [
        {"id": 1, "game": 10},
        {"id": 2},  # pas de game
        {"id": 3, "game": None},
    ]

    by_game = cmd.index_multiplayer_by_game(mp_list)

    assert list(by_game.keys()) == [10]
    assert len(by_game[10]) == 1


def test_compute_min_age_handles_empty_and_esrb_and_unknown():
    cmd = make_command()

    # Aucun rating
    assert cmd.compute_min_age({"id": 1}, {}) is None

    # ESRB mapping
    game_data = {"id": 1, "age_ratings": [1]}
    age_ratings_map = {1: {"id": 1, "category": 1, "rating": 4}}  # ESRB T -> 13 ans
    assert cmd.compute_min_age(game_data, age_ratings_map) == 13

    # Ratings non reconnus -> None
    game_data = {"id": 1, "age_ratings": [2]}
    age_ratings_map = {2: {"id": 2, "category": 99, "rating": 999}}
    assert cmd.compute_min_age(game_data, age_ratings_map) is None

    # Rating id présent dans la liste mais manquant dans la map -> branche "if not ar: continue"
    game_data = {"id": 1, "age_ratings": [3]}
    age_ratings_map = {}
    assert cmd.compute_min_age(game_data, age_ratings_map) is None


def test_compute_player_counts_various_cases():
    cmd = make_command()

    # Aucun mode pour ce jeu
    assert cmd.compute_player_counts({"id": 1}, {}) == (None, None)

    # Modes sans valeurs max -> None, None
    mp_by_game = {1: [{"id": 10}]}
    assert cmd.compute_player_counts({"id": 1}, mp_by_game) == (None, None)

    # Modes avec valeurs et sans coop -> min_players=1
    mp_by_game = {
        1: [
            {
                "id": 10,
                "offlinemax": 2,
                "onlinemax": 4,
                "offlinecoopmax": None,
                "onlinecoopmax": None,
                "offlinecoop": False,
                "onlinecoop": False,
                "campaigncoop": False,
            }
        ]
    }
    min_players, max_players = cmd.compute_player_counts({"id": 1}, mp_by_game)
    assert min_players == 1
    assert max_players == 4


def test_sync_games_logs_error_when_upsert_fails(monkeypatch, capsys):
    cmd = make_command()

    def failing_upsert(self, *args, **kwargs):
        raise ValueError("boom")

    monkeypatch.setattr(
        "apps.games.management.commands.import_igdb_popular.Command._upsert_single_game",
        failing_upsert,
    )

    cmd._sync_games(
        games_data=[{"id": 1}],
        involved_map={},
        publishers_map={},
        covers_map={},
        age_ratings_map={},
        mp_by_game={},
    )

    captured = capsys.readouterr()
    assert "ERREUR" in captured.out


def test_sync_games_counts_updated_when_upsert_returns_false(monkeypatch, capsys):
    cmd = make_command()

    def upsert_returns_false(self, *args, **kwargs):
        return False

    monkeypatch.setattr(
        "apps.games.management.commands.import_igdb_popular.Command._upsert_single_game",
        upsert_returns_false,
    )

    cmd._sync_games(
        games_data=[{"id": 1}],
        involved_map={},
        publishers_map={},
        covers_map={},
        age_ratings_map={},
        mp_by_game={},
    )

    captured = capsys.readouterr()
    # Le message final doit contenir "0 créés, 1 mis à jour"
    assert "0 créés, 1 mis à jour" in captured.out


@pytest.mark.django_db
def test_find_publisher_for_game_returns_default_when_missing():
    cmd = make_command()

    game_data = {"id": 1, "involved_companies": [10]}
    involved_map = {10: {"id": 10, "company": 99, "publisher": False}}
    publishers_map = {}

    publisher = cmd.find_publisher_for_game(game_data, involved_map, publishers_map)

    assert isinstance(publisher, Publisher)
    assert publisher.name == "Unknown publisher"


@pytest.mark.django_db
def test_find_publisher_for_game_skips_missing_involved_ids():
    cmd = make_command()

    # L'ID 999 est dans la liste mais pas dans involved_map -> branche "if not ic: continue"
    game_data = {"id": 1, "involved_companies": [999]}
    involved_map = {}
    publishers_map = {}

    publisher = cmd.find_publisher_for_game(game_data, involved_map, publishers_map)

    assert isinstance(publisher, Publisher)
    assert publisher.name == "Unknown publisher"


@pytest.mark.django_db
def test_ensure_publishers_counts_updates():
    cmd = make_command()

    # Publisher déjà existant avec igdb_id=1
    Publisher.objects.create(igdb_id=1, name="Old Name", description="Old")

    companies_map = {
        1: {"id": 1, "name": "New Name", "description": "New"},
    }

    mapping = cmd.ensure_publishers(companies_map)

    assert 1 in mapping
    publisher = mapping[1]
    assert publisher.name == "New Name"


@pytest.mark.django_db
def test_sync_game_relations_clears_when_no_ids():
    cmd = make_command()

    genre = Genre.objects.create(igdb_id=1, nom_genre="Action", description="")
    platform = Platform.objects.create(igdb_id=2, nom_plateforme="PC", description="")
    publisher = Publisher.objects.create(name="Pub", description="")

    game = Game.objects.create(
        igdb_id=1,
        name="Test Game",
        description="",
        release_date=datetime.date(2020, 1, 1),
        publisher=publisher,
    )
    game.genres.add(genre)
    game.platforms.add(platform)

    # Appel avec listes vides -> devrait faire clear()
    cmd._sync_game_relations({"genres": [], "platforms": []}, game)

    assert game.genres.count() == 0
    assert game.platforms.count() == 0
