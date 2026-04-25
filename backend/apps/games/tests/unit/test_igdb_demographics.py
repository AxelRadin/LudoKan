"""Tests unitaires pour apps.games.igdb_demographics (sans DB, mocks igdb_request)."""

import pytest

from apps.games.igdb_demographics import (
    compute_min_age,
    compute_player_counts,
    fetch_age_ratings_map,
    fetch_multiplayer_modes_raw,
    filter_games_raw_by_demographics,
    index_multiplayer_by_game,
)


def test_index_multiplayer_by_game_skips_entry_without_game():
    assert index_multiplayer_by_game([{"id": 1, "offlinemax": 2}, {"game": None, "id": 2}]) == {}


def test_fetch_age_ratings_map_empty_ids_returns_empty_dict():
    def _no_call(_ep, _q):
        raise AssertionError("igdb_request should not be called for empty ids")

    assert fetch_age_ratings_map(_no_call, []) == {}


def test_fetch_age_ratings_map_skips_non_list_response():
    calls = []

    def mock_igdb(ep, q):
        calls.append((ep, q))
        return {"error": "not a list"}

    out = fetch_age_ratings_map(mock_igdb, [99])
    assert out == {}
    assert len(calls) == 1


def test_fetch_multiplayer_modes_raw_empty_ids_returns_empty_list():
    def _no_call(_ep, _q):
        raise AssertionError("igdb_request should not be called")

    assert fetch_multiplayer_modes_raw(_no_call, []) == []


def test_filter_games_raw_empty_list_returns_same():
    def _no_call(_ep, _q):
        raise AssertionError("no igdb when empty games")

    assert filter_games_raw_by_demographics(_no_call, [], min_age=12, min_players=None, max_players=None) == []


def test_filter_games_raw_no_numeric_filters_returns_unchanged():
    games = [{"id": 1, "name": "A"}]

    def _no_call(_ep, _q):
        raise AssertionError("no fetch without numeric filters")

    assert filter_games_raw_by_demographics(_no_call, games, None, None, None) is games


@pytest.fixture
def igdb_request_demographics_stub():
    """age_ratings id 10 = PEGI 12 ; multiplayer_modes jeu 100 : max 4, solo (min_players=1)."""

    def _req(endpoint, _query):
        if endpoint == "age_ratings":
            return [{"id": 10, "category": 2, "rating": 3}]
        if endpoint == "multiplayer_modes":
            return [
                {
                    "id": 200,
                    "game": 100,
                    "offlinemax": 4,
                    "onlinemax": None,
                    "offlinecoopmax": None,
                    "onlinecoopmax": None,
                    "offlinecoop": False,
                    "onlinecoop": False,
                    "campaigncoop": False,
                }
            ]
        return []

    return _req


@pytest.fixture
def igdb_request_coop_min2_stub():
    """Même âge PEGI 12 ; coop → min_players=2 sur le jeu 101."""

    def _req(endpoint, _query):
        if endpoint == "age_ratings":
            return [{"id": 10, "category": 2, "rating": 3}]
        if endpoint == "multiplayer_modes":
            return [
                {
                    "id": 201,
                    "game": 101,
                    "offlinemax": 4,
                    "onlinemax": None,
                    "offlinecoopmax": None,
                    "onlinecoopmax": None,
                    "offlinecoop": True,
                    "onlinecoop": False,
                    "campaigncoop": False,
                }
            ]
        return []

    return _req


def test_filter_games_raw_rejects_when_min_age_unmet(igdb_request_demographics_stub):
    games = [{"id": 100, "age_ratings": [10], "multiplayer_modes": [200]}]
    out = filter_games_raw_by_demographics(igdb_request_demographics_stub, games, min_age=16, min_players=None, max_players=None)
    assert out == []


def test_filter_games_raw_rejects_when_min_players_unmet(igdb_request_coop_min2_stub):
    """Jeu min_players=2 (coop) : filtre min_players=1 (jeux jouables seul) → exclu."""
    games = [{"id": 101, "age_ratings": [10], "multiplayer_modes": [201]}]
    out = filter_games_raw_by_demographics(igdb_request_coop_min2_stub, games, min_age=None, min_players=1, max_players=None)
    assert out == []


def test_filter_games_raw_rejects_when_max_players_unmet(igdb_request_demographics_stub):
    games = [{"id": 100, "age_ratings": [10], "multiplayer_modes": [200]}]
    out = filter_games_raw_by_demographics(igdb_request_demographics_stub, games, min_age=None, min_players=None, max_players=8)
    assert out == []


def test_filter_games_raw_passes_and_sets_ludokan_keys(igdb_request_demographics_stub):
    games = [{"id": 100, "age_ratings": [10], "multiplayer_modes": [200], "name": "X"}]
    out = filter_games_raw_by_demographics(
        igdb_request_demographics_stub,
        games,
        min_age=12,
        min_players=2,
        max_players=4,
    )
    assert len(out) == 1
    assert out[0]["_ludokan_min_age"] == 12
    assert out[0]["_ludokan_min_players"] == 1
    assert out[0]["_ludokan_max_players"] == 4
    assert out[0]["name"] == "X"


def test_filter_games_raw_one_game_fails_other_passes(igdb_request_demographics_stub):
    games = [
        {"id": 1, "age_ratings": [], "multiplayer_modes": []},
        {"id": 100, "age_ratings": [10], "multiplayer_modes": [200]},
    ]
    out = filter_games_raw_by_demographics(igdb_request_demographics_stub, games, min_age=12, min_players=None, max_players=None)
    assert len(out) == 1
    assert out[0]["id"] == 100


def test_compute_min_age_skips_unknown_rating_id_and_uses_esrb():
    game = {"id": 1, "age_ratings": [999, 11]}
    ar_map = {
        999: {"category": 2, "rating": 99},
        11: {"category": 1, "rating": 4},
    }
    assert compute_min_age(game, ar_map) == 13


def test_compute_min_age_no_mapped_age_returns_none():
    game = {"id": 1, "age_ratings": [1]}
    ar_map = {1: {"category": 2, "rating": 99}}
    assert compute_min_age(game, ar_map) is None


def test_compute_min_age_skips_rating_id_missing_from_map():
    """Branche `if not ar: continue` lorsque l’id age_rating n’est pas dans la map."""
    assert compute_min_age({"id": 1, "age_ratings": [55]}, {}) is None


def test_compute_player_counts_modes_without_positive_max_returns_none_none():
    game = {"id": 50}
    mp_by_game = {
        50: [
            {
                "offlinemax": None,
                "onlinemax": None,
                "offlinecoopmax": None,
                "onlinecoopmax": None,
            }
        ]
    }
    assert compute_player_counts(game, mp_by_game) == (None, None)


def test_fetch_multiplayer_modes_raw_batches_over_500_ids():
    ids = list(range(600))
    calls = []

    def mock_igdb(ep, q):
        calls.append(q)
        assert "multiplayer_modes" == ep
        return [{"id": i, "game": 1, "offlinemax": 2} for i in range(5)]

    fetch_multiplayer_modes_raw(mock_igdb, ids)
    assert len(calls) == 2
