"""
Dérivés âge / joueurs depuis les payloads IGDB (aligné sur import_igdb_popular).

Utilisé par l’import et le proxy IGDB pour post-filtrer comme GameFilter (gte/lte/gte).
"""

from __future__ import annotations

from typing import Any, Callable

IgdbRequestFn = Callable[[str, str], Any]


def index_multiplayer_by_game(mp_list: list[dict]) -> dict[int, list[dict]]:
    """{igdb_game_id: [multiplayer_mode, ...]}"""
    by_game: dict[int, list[dict]] = {}
    for mp in mp_list:
        game_id = mp.get("game")
        if not game_id:
            continue
        by_game.setdefault(int(game_id), []).append(mp)
    return by_game


def compute_min_age(game_data: dict[str, Any], age_ratings_map: dict[int, dict]) -> int | None:
    rating_ids = game_data.get("age_ratings") or []
    if not rating_ids:
        return None

    ages: list[int] = []
    pegi_map = {1: 3, 2: 7, 3: 12, 4: 16, 5: 18}
    esrb_map = {2: 6, 3: 10, 4: 13, 5: 17, 6: 18}

    for rid in rating_ids:
        ar = age_ratings_map.get(rid)
        if not ar:
            continue
        cat = ar.get("category")
        rating_code = ar.get("rating")

        if cat == 2:
            age = pegi_map.get(rating_code)
            if age:
                ages.append(age)
        elif cat == 1:
            age = esrb_map.get(rating_code)
            if age:
                ages.append(age)

    if not ages:
        return None
    return min(ages)


def compute_player_counts(game_data: dict[str, Any], mp_by_game: dict[int, list[dict]]) -> tuple[int | None, int | None]:
    game_id = game_data["id"]
    modes = mp_by_game.get(game_id, [])
    if not modes:
        return None, None

    candidates_max: list[int] = []
    for m in modes:
        for key in ("offlinemax", "onlinemax", "offlinecoopmax", "onlinecoopmax"):
            v = m.get(key)
            if v:
                candidates_max.append(int(v))

    if not candidates_max:
        return None, None

    max_players = max(candidates_max)

    min_players = 1
    for m in modes:
        if m.get("offlinecoop") or m.get("onlinecoop") or m.get("campaigncoop"):
            min_players = 2
            break

    return min_players, max_players


def fetch_age_ratings_map(igdb_request: IgdbRequestFn, ids: list[int]) -> dict[int, dict]:
    if not ids:
        return {}
    result: dict[int, dict] = {}
    unique_ids = list(set(ids))
    for i in range(0, len(unique_ids), 500):
        chunk = unique_ids[i : i + 500]
        ids_str = ",".join(str(x) for x in chunk)
        query = f"""
            fields id, category, rating;
            where id = ({ids_str});
            limit 500;
        """
        data = igdb_request("age_ratings", query)
        if not isinstance(data, list):
            continue
        for ar in data:
            if isinstance(ar, dict) and ar.get("id") is not None:
                result[int(ar["id"])] = ar
    return result


def fetch_multiplayer_modes_raw(igdb_request: IgdbRequestFn, ids: list[int]) -> list[dict]:
    if not ids:
        return []
    result: list[dict] = []
    unique_ids = list(set(ids))
    for i in range(0, len(unique_ids), 500):
        chunk = unique_ids[i : i + 500]
        ids_str = ",".join(str(x) for x in chunk)
        query = f"""
            fields
            id,
            game,
            offlinemax,
            onlinemax,
            offlinecoopmax,
            onlinecoopmax,
            offlinecoop,
            onlinecoop,
            campaigncoop;
            where id = ({ids_str});
            limit 500;
        """
        data = igdb_request("multiplayer_modes", query)
        if isinstance(data, list):
            result.extend(data)
    return result


def _numeric_filter_result(
    game_data: dict[str, Any],
    age_ratings_map: dict[int, dict],
    mp_by_game: dict[int, list[dict]],
    min_age: int | None,
    min_players: int | None,
    max_players: int | None,
) -> tuple[bool, int | None, int | None, int | None]:
    """Même sémantique que GameFilter (min_age gte, min_players lte, max_players gte)."""
    ma = compute_min_age(game_data, age_ratings_map)
    mn, mx = compute_player_counts(game_data, mp_by_game)

    if min_age is not None:
        if ma is None or ma < min_age:
            return False, ma, mn, mx
    if min_players is not None:
        if mn is None or mn > min_players:
            return False, ma, mn, mx
    if max_players is not None:
        if mx is None or mx < max_players:
            return False, ma, mn, mx
    return True, ma, mn, mx


def filter_games_raw_by_demographics(
    igdb_request: IgdbRequestFn,
    games_raw: list[dict[str, Any]],
    min_age: int | None,
    min_players: int | None,
    max_players: int | None,
) -> list[dict[str, Any]]:
    """Post-filtre une liste de jeux IGDB bruts. Sans filtre numérique, retour inchangé."""
    if not games_raw:
        return games_raw
    if min_age is None and min_players is None and max_players is None:
        return games_raw

    age_ids: list[int] = []
    mp_ids: list[int] = []
    for g in games_raw:
        age_ids.extend(g.get("age_ratings") or [])
        mp_ids.extend(g.get("multiplayer_modes") or [])

    age_map = fetch_age_ratings_map(igdb_request, age_ids)
    mp_list = fetch_multiplayer_modes_raw(igdb_request, mp_ids)
    mp_by_game = index_multiplayer_by_game(mp_list)

    out: list[dict[str, Any]] = []
    for g in games_raw:
        ok, ma, mn, mx = _numeric_filter_result(g, age_map, mp_by_game, min_age, min_players, max_players)
        if not ok:
            continue
        ng = dict(g)
        ng["_ludokan_min_age"] = ma
        ng["_ludokan_min_players"] = mn
        ng["_ludokan_max_players"] = mx
        out.append(ng)
    return out
