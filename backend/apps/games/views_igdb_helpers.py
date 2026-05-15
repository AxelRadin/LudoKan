"""
Logique métier du proxy IGDB (hors classes APIView).

Les fonctions prennent `igdb_request` (bound method) pour que les tests qui
mockent `apps.games.views_igdb.igdb_client` restent valides.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import urlencode

import requests

from apps.games.igdb_demographics import filter_games_raw_by_demographics
from apps.games.igdb_normalizer import enrich_normalized_games, normalize_igdb_game
from apps.games.igdb_proxy_constants import (
    FIELDS_GAMES_LIST,
    FIELDS_GAMES_SEARCH,
    FIELDS_IGDB_DEMOGRAPHICS_SUFFIX,
    FIELDS_SEARCH_PAGE,
    MAX_TRANSLATE_TEXT_LEN,
    MYMEMORY_URL,
    TRENDING_SORTS,
)

IgdbRequestFn = Callable[[str, str], Any]


@dataclass
class IgdbFilters:
    """Dataclass pour regrouper les paramètres de filtrage IGDB et réduire la complexité des signatures."""

    genre_ids: list[int] = field(default_factory=list)
    platform_ids: list[int] = field(default_factory=list)
    min_age: int | None = None
    min_players: int | None = None
    max_players: int | None = None
    theme_ids: list[int] = field(default_factory=list)
    game_mode_ids: list[int] = field(default_factory=list)
    player_perspective_ids: list[int] = field(default_factory=list)
    min_rating: float | None = None
    release_year_min: int | None = None
    release_year_max: int | None = None
    sort: str = "popularity"

    @classmethod
    def from_request(cls, request) -> IgdbFilters:

        p = request.query_params
        return cls(
            genre_ids=parse_igdb_id_list_param(p.get("genre")),
            platform_ids=parse_igdb_id_list_param(p.get("platform")),
            min_age=parse_optional_int_query(p.get("min_age")),
            min_players=parse_optional_int_query(p.get("min_players")),
            max_players=parse_optional_int_query(p.get("max_players")),
            theme_ids=parse_igdb_id_list_param(p.get("theme")),
            game_mode_ids=parse_igdb_id_list_param(p.get("game_mode")),
            player_perspective_ids=parse_igdb_id_list_param(p.get("player_perspective")),
            min_rating=parse_optional_float_query(p.get("min_rating")),
            release_year_min=parse_optional_int_query(p.get("release_year_min")),
            release_year_max=parse_optional_int_query(p.get("release_year_max")),
            sort=p.get("sort", "popularity"),
        )

    @property
    def has_demographics(self) -> bool:
        return self.min_age is not None or self.min_players is not None or self.max_players is not None


def igdb_response_as_list(data) -> list:
    return data if isinstance(data, list) else []


def parse_optional_int_query(val: Any) -> int | None:
    try:
        return int(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def parse_optional_float_query(val: Any) -> float | None:
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None


def parse_igdb_id_list_param(val: str | None) -> list[int]:
    if not val:
        return []
    ids = []
    for part in val.split(","):
        stripped = part.strip()
        if stripped:
            try:
                ids.append(int(stripped))
            except (ValueError, TypeError):
                continue
    return ids


def _genre_platform_where_extra_clauses(f: IgdbFilters) -> list[str]:
    extras: list[str] = []
    if f.genre_ids:
        extras.append("(" + " | ".join(f"genres = ({g})" for g in f.genre_ids) + ")")
    if f.platform_ids:
        extras.append("(" + " | ".join(f"platforms = ({p})" for p in f.platform_ids) + ")")
    if f.theme_ids:
        extras.append("(" + " | ".join(f"themes = ({t})" for t in f.theme_ids) + ")")
    if f.game_mode_ids:
        extras.append("(" + " | ".join(f"game_modes = ({m})" for m in f.game_mode_ids) + ")")
    if f.player_perspective_ids:
        extras.append("(" + " | ".join(f"player_perspectives = ({pp})" for pp in f.player_perspective_ids) + ")")
    if f.min_rating is not None:
        extras.append(f"total_rating >= {f.min_rating}")
    if f.release_year_min is not None:
        ts = int(datetime.datetime(f.release_year_min, 1, 1, tzinfo=datetime.timezone.utc).timestamp())
        extras.append(f"first_release_date >= {ts}")
    if f.release_year_max is not None:
        ts = int(datetime.datetime(f.release_year_max, 12, 31, 23, 59, 59, tzinfo=datetime.timezone.utc).timestamp())
        extras.append(f"first_release_date <= {ts}")
    return extras


def merge_igdb_where_predicates(base_predicate: str, f: IgdbFilters) -> str:
    s = base_predicate.strip()
    where_part = s
    sort_part = ""
    if "sort " in s.lower():
        idx = s.lower().find("sort ")
        where_part = s[:idx].strip().rstrip(";")
        sort_part = s[idx:].strip()

    if where_part.lower().startswith("where "):
        where_part = where_part[6:].strip()

    extras = _genre_platform_where_extra_clauses(f)
    combined = extras
    if where_part:
        combined.append(where_part)

    res = ""
    if combined:
        res = "where " + " & ".join(combined)

    if sort_part:
        if res:
            res = res.rstrip(";") + "; " + sort_part
        else:
            res = sort_part

    if res and not res.endswith(";"):
        res += ";"
    return res


def _ids_from_igdb_relation(game: dict, field: str) -> set[int]:
    out: set[int] = set()
    for x in game.get(field) or []:
        if isinstance(x, int):
            out.add(x)
        elif isinstance(x, dict) and x.get("id") is not None:
            out.add(int(x["id"]))
    return out


def filter_raw_games_by_genre_platform_ids(games: list[dict], genre_ids: list[int], platform_ids: list[int]) -> list[dict]:
    if not genre_ids and not platform_ids:
        return games
    filtered = []
    for g in games:
        if genre_ids and not _ids_from_igdb_relation(g, "genres").intersection(genre_ids):
            continue
        if platform_ids and not _ids_from_igdb_relation(g, "platforms").intersection(platform_ids):
            continue
        filtered.append(g)
    return filtered


def _fields_with_optional_genres_and_demographics(base_fields: str, include_genres: bool, use_demo: bool) -> str:
    f = base_fields.rstrip(";")
    if include_genres:
        f += ",genres"
    if use_demo:
        f += FIELDS_IGDB_DEMOGRAPHICS_SUFFIX
    return f + ";"


# --- Search-page ---


def search_page_name_matches(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
    offset: int,
    filters: IgdbFilters,
) -> dict:
    needs_post_slice = filters.has_demographics

    def fetch_for_q(q_inner: str) -> tuple[list, int]:
        fields = _fields_with_optional_genres_and_demographics(FIELDS_SEARCH_PAGE, bool(filters.genre_ids), needs_post_slice)
        core = f'name ~ *"{q_inner}"* & total_rating_count > 0'
        where_line = merge_igdb_where_predicates(core, filters)

        sort_clause = TRENDING_SORTS.get(filters.sort, TRENDING_SORTS["popularity"])
        parts = sort_clause.split(";")
        gen = (p.strip() + ";" for p in parts if p.strip().startswith("sort"))
        sort_part = next(gen, "sort total_rating_count desc;")

        if needs_post_slice:
            # On augmente à 500 pour avoir une meilleure profondeur en mode démo
            raw_cap = 500
            name_body = f"{fields} {where_line}; {sort_part} limit {raw_cap}; offset 0;"
        else:
            name_body = f"{fields} {where_line}; {sort_part} limit {limit}; offset {offset};"

        arr = igdb_response_as_list(igdb_request("games", name_body))

        if needs_post_slice:
            full_filtered = filter_games_raw_by_demographics(igdb_request, arr, filters.min_age, filters.min_players, filters.max_players)
            total_count = len(full_filtered)
            arr = full_filtered[offset : offset + limit]
        else:
            # Mode standard : on demande le count réel à IGDB
            where_only = where_line.split("sort")[0].strip()
            count_data = igdb_request("games/count", where_only)
            total_count = count_data.get("count", 0) if isinstance(count_data, dict) else 0

        return arr, total_count

    arr, total = fetch_for_q(q_esc)
    if not arr and q_norm_esc != q_esc:
        arr, total = fetch_for_q(q_norm_esc)

    return {"results": arr, "total_count": total}


def search_page_fallback_search(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    limit: int,
    filters: IgdbFilters,
) -> dict:
    fields = _fields_with_optional_genres_and_demographics(FIELDS_SEARCH_PAGE, bool(filters.genre_ids), filters.has_demographics)
    search_body = f'{fields} search "{q_esc}"; limit 50;'
    try:
        search_arr = igdb_response_as_list(igdb_request("games", search_body))
        search_arr = _apply_raw_list_filters(igdb_request, search_arr, filters)
        search_arr.sort(key=lambda x: -(x.get("total_rating_count") or 0))
        return {"results": search_arr[:limit], "total_count": min(len(search_arr), 50)}
    except Exception:
        return {"results": [], "total_count": 0}


# --- Trending ---


def _trending_use_demo_and_merged_clause(filters: IgdbFilters) -> tuple[bool, str]:

    sort_query = TRENDING_SORTS.get(filters.sort, TRENDING_SORTS["popularity"])
    merged = merge_igdb_where_predicates(sort_query, filters)
    return filters.has_demographics, merged


def trending_fetch_games_array(
    igdb_request: IgdbRequestFn,
    limit: int,
    offset: int,
    filters: IgdbFilters,
) -> list:
    use_demo, merged_clause = _trending_use_demo_and_merged_clause(filters)

    fields = _fields_with_optional_genres_and_demographics(FIELDS_GAMES_LIST, bool(filters.genre_ids), use_demo)
    if use_demo:
        # On augmente raw_cap pour permettre une navigation plus profonde en mode démographique
        raw_cap = min(max((offset + limit) * 5, 100), 1000)
        query = f"{fields} {merged_clause} limit {raw_cap}; offset 0;"
        raw = igdb_response_as_list(igdb_request("games", query))
        raw = filter_games_raw_by_demographics(igdb_request, raw, filters.min_age, filters.min_players, filters.max_players)
        return raw[offset : offset + limit]

    query = f"{fields} {merged_clause} limit {limit}; offset {offset};"
    return igdb_response_as_list(igdb_request("games", query))


def trending_fetch_total_count(igdb_request: IgdbRequestFn, filters: IgdbFilters) -> int:
    try:
        use_demo, merged_clause = _trending_use_demo_and_merged_clause(filters)
        where_part = merged_clause.split("sort")[0].strip()
        if use_demo:
            fields = _fields_with_optional_genres_and_demographics(FIELDS_GAMES_LIST, bool(filters.genre_ids), True)
            # On augmente la limite à 500 pour permettre plus de pages en mode démo
            raw = igdb_response_as_list(igdb_request("games", f"{fields} {where_part} limit 500;"))
            return len(filter_games_raw_by_demographics(igdb_request, raw, filters.min_age, filters.min_players, filters.max_players))

        # Mode standard : on utilise le endpoint count d'IGDB pour la précision
        count_data = igdb_request("games/count", where_part)
        return count_data.get("count", 0) if isinstance(count_data, dict) else 0
    except Exception:
        return 0


def trending_enrich_for_response(arr: list, enrich: bool, enrich_fn, user=None) -> list:
    if enrich:
        return enrich_normalized_games(enrich_fn(arr), user)
    normalized = [
        normalize_igdb_game({**g, "display_name": g.get("name") or "", "name_fr": None, "name_en": (g.get("name") or "").strip()}) for g in arr
    ]
    return enrich_normalized_games(normalized, user)


# --- Search suggest/non-suggest ---


def _apply_raw_list_filters(igdb_request: IgdbRequestFn, games: list, filters: IgdbFilters) -> list:
    out = filter_raw_games_by_genre_platform_ids(games, filters.genre_ids, filters.platform_ids)
    if filters.theme_ids:
        out = [g for g in out if _ids_from_igdb_relation(g, "themes").intersection(filters.theme_ids)]
    if filters.game_mode_ids:
        out = [g for g in out if _ids_from_igdb_relation(g, "game_modes").intersection(filters.game_mode_ids)]
    if filters.player_perspective_ids:
        out = [g for g in out if _ids_from_igdb_relation(g, "player_perspectives").intersection(filters.player_perspective_ids)]
    if filters.min_rating is not None:
        out = [g for g in out if (g.get("total_rating") or 0) >= filters.min_rating]
    if filters.release_year_min is not None or filters.release_year_max is not None:
        out = [
            g
            for g in out
            if g.get("first_release_date")
            and (
                filters.release_year_min is None
                or datetime.datetime.fromtimestamp(g["first_release_date"], tz=datetime.timezone.utc).year >= filters.release_year_min
            )
            and (
                filters.release_year_max is None
                or datetime.datetime.fromtimestamp(g["first_release_date"], tz=datetime.timezone.utc).year <= filters.release_year_max
            )
        ]
    return filter_games_raw_by_demographics(igdb_request, out, filters.min_age, filters.min_players, filters.max_players)


def _igdb_search_games_list_query_setup(limit: int, filters: IgdbFilters) -> tuple[int, str]:
    use_demo = filters.has_demographics
    fetch_limit = max(limit * 4, 50) if (use_demo or filters.genre_ids or filters.platform_ids or filters.theme_ids) else limit
    fields = _fields_with_optional_genres_and_demographics(FIELDS_GAMES_SEARCH, bool(filters.genre_ids), use_demo)
    for f_id in ["themes", "game_modes", "player_perspectives"]:
        if getattr(filters, f"{f_id[:-1]}_ids") and f"{f_id}.id" not in fields:
            fields = fields.rstrip(";") + f",{f_id}.id;"
    return fetch_limit, fields


def igdb_search_suggest_results(igdb_request: IgdbRequestFn, q_esc: str, q_norm_esc: str, limit: int, filters: IgdbFilters) -> list:
    fetch_limit, fields = _igdb_search_games_list_query_setup(limit, filters)
    core = f'name ~ *"{q_esc}"* & total_rating_count > 0'
    where_line = merge_igdb_where_predicates(core, filters)

    name_res = []
    try:
        name_res = igdb_response_as_list(igdb_request("games", f"{fields} {where_line}; sort total_rating_count desc; limit {fetch_limit};"))
    except Exception:
        pass

    search_res = []
    try:
        search_res = igdb_response_as_list(igdb_request("games", f'{fields} search "{q_esc}"; limit 50;'))
    except Exception:
        pass

    seen = set()
    merged = []
    for g in name_res + search_res:
        gid = g.get("id")
        if gid is not None and gid not in seen:
            seen.add(gid)
            merged.append(g)

    filtered = _apply_raw_list_filters(igdb_request, merged, filters)
    arr = sorted([g for g in filtered if (g.get("total_rating_count") or 0) > 0], key=lambda x: -(x.get("total_rating_count") or 0))[:limit]

    if not arr and q_norm_esc != q_esc:
        fallback = []
        try:
            fallback = igdb_response_as_list(igdb_request("games", f'{fields} search "{q_norm_esc}"; limit 50;'))
        except Exception:
            pass
        arr = sorted(
            [g for g in _apply_raw_list_filters(igdb_request, fallback, filters) if (g.get("total_rating_count") or 0) > 0],
            key=lambda x: -(x.get("total_rating_count") or 0),
        )[:limit]
    return arr


def igdb_search_non_suggest_results(igdb_request: IgdbRequestFn, q_esc: str, q_norm_esc: str, limit: int, filters: IgdbFilters) -> list:
    fetch_limit, fields = _igdb_search_games_list_query_setup(limit, filters)
    query = f'{fields} search "{q_esc}"; limit {fetch_limit};'
    arr = igdb_response_as_list(igdb_request("games", query))
    if not arr and q_norm_esc != q_esc:
        try:
            arr = igdb_response_as_list(igdb_request("games", f'{fields} search "{q_norm_esc}"; limit {fetch_limit};'))
        except Exception:
            pass
    return _apply_raw_list_filters(igdb_request, arr, filters)[:limit]


# --- Aliases for tests ---
def parse_genre_id_param(val: str | None) -> Any:
    if val is None:
        return None
    ids = parse_igdb_id_list_param(val)
    if not ids:
        return None
    return ids[0] if len(ids) == 1 else ids


def merge_trending_where_with_filters(
    base: str, g: list[int], p: list[int], theme=None, mode=None, pp=None, rating=None, rmin=None, rmax=None
) -> str:
    f = IgdbFilters(
        genre_ids=g,
        platform_ids=p,
        theme_ids=theme or [],
        game_mode_ids=mode or [],
        player_perspective_ids=pp or [],
        min_rating=rating,
        release_year_min=rmin,
        release_year_max=rmax,
    )
    if not _genre_platform_where_extra_clauses(f):
        return base.strip()
    return merge_igdb_where_predicates(base, f)


def trending_fetch_total_count_old(
    igdb_request,
    genre_ids,
    platform_ids,
    sort,
    min_age=None,
    min_players=None,
    max_players=None,
    theme_ids=None,
    game_mode_ids=None,
    player_perspective_ids=None,
    min_rating=None,
    release_year_min=None,
    release_year_max=None,
) -> int:
    f = IgdbFilters(
        genre_ids=genre_ids,
        platform_ids=platform_ids,
        sort=sort,
        min_age=min_age,
        min_players=min_players,
        max_players=max_players,
        theme_ids=theme_ids or [],
        game_mode_ids=game_mode_ids or [],
        player_perspective_ids=player_perspective_ids or [],
        min_rating=min_rating,
        release_year_min=release_year_min,
        release_year_max=release_year_max,
    )
    return trending_fetch_total_count(igdb_request, f)


# --- Translation ---


def split_sentences_for_translate(text: str) -> list[str]:
    res, start, i, n = [], 0, 0, len(text)
    while i < n:
        if text[i] in ".!?":
            i += 1
            while i < n and text[i].isspace():
                i += 1
            res.append(text[start:i])
            start = i
        else:
            i += 1
    if start < n:
        res.append(text[start:])
    return [p for p in res if p.strip()] or [text]


def _chunk_text_for_translation(text: str, max_chunk_size: int = 480) -> list[str]:
    """Découpe le texte en morceaux exploitables par l'API de traduction."""
    sentences = split_sentences_for_translate(text)
    chunks, current = [], ""
    for s in sentences:
        if len(current + s) > max_chunk_size:
            if current:
                chunks.append(current)
            current = s
        else:
            current += s
    if current:
        chunks.append(current)
    if not chunks and text:
        chunks = [text[:max_chunk_size]]
    return chunks


def _fetch_single_translation_chunk(chunk: str) -> str:
    """Appelle l'API MyMemory pour traduire un seul morceau de texte."""
    try:
        url = f"{MYMEMORY_URL}?{urlencode({'q': chunk, 'langpair': 'en|fr'})}"
        r = requests.get(url, headers={"User-Agent": "LudoKan/1.0"}, timeout=10)
        if not r.ok:
            return chunk
        data = r.json()
        trans = (data or {}).get("responseData", {}).get("translatedText")
        if isinstance(trans, str) and trans.strip():
            return str(trans).replace("q=", "").strip()
        return chunk
    except Exception:
        return chunk


def translate_request_body_to_french(text: str) -> str:
    if not text:
        return ""
    text = text[:MAX_TRANSLATE_TEXT_LEN]
    chunks = _chunk_text_for_translation(text)
    res = [_fetch_single_translation_chunk(c) for c in chunks]
    return " ".join(res).strip()


# --- Others ---


def franchises_collections_fetch_terms(igdb_request: IgdbRequestFn, terms: list[str]) -> tuple[list, list]:
    f, c = [], []
    for term in terms:
        q = f'fields id, name; where name ~ *"{term}"*; limit 5;'
        try:
            f.extend(igdb_response_as_list(igdb_request("franchises", q)))
        except Exception:
            pass
        try:
            c.extend(igdb_response_as_list(igdb_request("collections", q)))
        except Exception:
            pass
    return f, c


def franchises_search_build_payload(all_franchises: list, all_collections: list) -> list:
    res, seen = [], set()
    for items, t in [(all_franchises, "franchise"), (all_collections, "collection")]:
        for i in items:
            fid = i.get("id")
            if fid is not None and fid not in seen:
                seen.add(fid)
                res.append({"id": fid, "name": i.get("name", ""), "type": t})
    return res
