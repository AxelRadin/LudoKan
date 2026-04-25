"""
Logique métier du proxy IGDB (hors classes APIView).

Les fonctions prennent `igdb_request` (bound method) pour que les tests qui
mockent `apps.games.views_igdb.igdb_client` restent valides.
"""

from __future__ import annotations

from typing import Any, Callable
from urllib.parse import urlencode

import requests

from apps.games.igdb_demographics import filter_games_raw_by_demographics
from apps.games.igdb_normalizer import enrich_normalized_games, normalize_igdb_game
from apps.games.igdb_proxy_constants import (
    FIELDS_GAMES_LIST,
    FIELDS_GAMES_LIST_WITH_GENRES,
    FIELDS_GAMES_SEARCH,
    FIELDS_IGDB_DEMOGRAPHICS_SUFFIX,
    FIELDS_SEARCH_PAGE,
    MAX_TRANSLATE_TEXT_LEN,
    MYMEMORY_URL,
    TRENDING_SORTS,
)

IgdbRequestFn = Callable[[str, str], Any]


def igdb_response_as_list(data) -> list:
    return data if isinstance(data, list) else []


def _has_demographic_filters(
    min_age: int | None,
    min_players: int | None,
    max_players: int | None,
) -> bool:
    return min_age is not None or min_players is not None or max_players is not None


def merge_igdb_where_predicates(
    base_predicate: str,
    genre_ids: list[int],
    platform_ids: list[int],
) -> str:
    """Clause `where` sans point-virgule final (à suffixer par `; sort ...`)."""
    extras: list[str] = []
    if genre_ids:
        extras.append("(" + " | ".join(f"genres = ({g})" for g in genre_ids) + ")")
    if platform_ids:
        extras.append("(" + " | ".join(f"platforms = ({p})" for p in platform_ids) + ")")
    parts = extras + [base_predicate.strip()]
    return "where " + " & ".join(parts)


def _ids_from_igdb_relation(game: dict, field: str) -> set[int]:
    out: set[int] = set()
    for x in game.get(field) or []:
        if isinstance(x, int):
            out.add(x)
        elif isinstance(x, dict) and x.get("id") is not None:
            out.add(int(x["id"]))
    return out


def filter_raw_games_by_genre_platform_ids(
    games: list[dict],
    genre_ids: list[int],
    platform_ids: list[int],
) -> list[dict]:
    if not genre_ids and not platform_ids:
        return games
    filtered: list[dict] = []
    for g in games:
        if genre_ids and not _ids_from_igdb_relation(g, "genres").intersection(genre_ids):
            continue
        if platform_ids and not _ids_from_igdb_relation(g, "platforms").intersection(platform_ids):
            continue
        filtered.append(g)
    return filtered


def _fields_with_optional_genres_and_demographics(
    base_fields: str,
    include_genres: bool,
    use_demo: bool,
) -> str:
    f = base_fields.rstrip(";")
    if include_genres:
        f += ",genres"
    if use_demo:
        f += FIELDS_IGDB_DEMOGRAPHICS_SUFFIX
    return f + ";"


def _search_page_fields(genre_ids: list[int], use_demo: bool) -> str:
    return _fields_with_optional_genres_and_demographics(
        FIELDS_SEARCH_PAGE,
        bool(genre_ids),
        use_demo,
    )


def _search_games_fields_for_list(genre_ids: list[int], use_demo: bool) -> str:
    return _fields_with_optional_genres_and_demographics(
        FIELDS_GAMES_SEARCH,
        bool(genre_ids),
        use_demo,
    )


# --- Search-page ---


def search_page_name_matches(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
    offset: int,
    genre_ids: list[int] | None = None,
    platform_ids: list[int] | None = None,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> list:
    genre_ids = genre_ids or []
    platform_ids = platform_ids or []
    use_demo = _has_demographic_filters(min_age, min_players, max_players)
    needs_post_slice = use_demo

    def fetch_for_q(q_inner: str) -> list:
        fields = _search_page_fields(genre_ids, use_demo)
        core = f'name ~ *"{q_inner}"* & total_rating_count > 0'
        where_line = merge_igdb_where_predicates(core, genre_ids, platform_ids)
        if needs_post_slice:
            raw_cap = min(max((offset + limit) * 5, 50), 200)
            name_body = f"{fields} {where_line}; sort total_rating_count desc; limit {raw_cap}; offset 0;"
        else:
            name_body = f"{fields} {where_line}; sort total_rating_count desc; limit {limit}; offset {offset};"
        arr = igdb_response_as_list(igdb_request("games", name_body))
        arr = filter_games_raw_by_demographics(igdb_request, arr, min_age, min_players, max_players)
        if needs_post_slice:
            arr = arr[offset : offset + limit]
        return arr

    arr = fetch_for_q(q_esc)
    if not arr and q_norm_esc != q_esc:
        arr = fetch_for_q(q_norm_esc)
    return arr


def search_page_fallback_search(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    limit: int,
    genre_ids: list[int] | None = None,
    platform_ids: list[int] | None = None,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> list:
    genre_ids = genre_ids or []
    platform_ids = platform_ids or []
    use_demo = _has_demographic_filters(min_age, min_players, max_players)
    fields = _search_page_fields(genre_ids, use_demo)
    search_body = f'{fields} search "{q_esc}"; limit 50;'
    try:
        search_arr = igdb_response_as_list(igdb_request("games", search_body))
        search_arr = filter_raw_games_by_genre_platform_ids(search_arr, genre_ids, platform_ids)
        search_arr = filter_games_raw_by_demographics(igdb_request, search_arr, min_age, min_players, max_players)
        return sorted(
            search_arr,
            key=lambda g: -(g.get("total_rating_count") or 0),
        )[:limit]
    except Exception:
        return []


# --- Trending ---


def parse_genre_id_param(genre_raw: str | None) -> int | None:
    try:
        return int(genre_raw) if genre_raw is not None else None
    except (TypeError, ValueError):
        return None


def parse_igdb_id_list_param(raw: str | None) -> list[int]:
    """IDs IGDB séparés par des virgules (genre / platform sur le proxy)."""
    if not raw or not str(raw).strip():
        return []
    out: list[int] = []
    for part in str(raw).split(","):
        part = part.strip()
        if not part:
            continue
        try:
            out.append(int(part))
        except ValueError:
            continue
    return out


def parse_optional_int_query(value) -> int | None:
    if value is None or (isinstance(value, str) and not str(value).strip()):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def merge_trending_where_with_filters(
    sort_clause: str,
    genre_ids: list[int],
    platform_ids: list[int],
) -> str:
    """
    Injecte des clauses genre / platform dans la partie `where` d'une clause IGDB
    du type « where ... ; sort ... ; ».
    """
    parts = sort_clause.strip().split(";")
    head = parts[0].strip()
    tail = ";".join(parts[1:]).strip()
    if not head.lower().startswith("where"):
        return sort_clause
    base_cond = head[5:].strip()
    extras: list[str] = []
    if genre_ids:
        extras.append("(" + " | ".join(f"genres = ({g})" for g in genre_ids) + ")")
    if platform_ids:
        extras.append("(" + " | ".join(f"platforms = ({p})" for p in platform_ids) + ")")
    cond = " & ".join(extras + [base_cond]) if extras else base_cond
    return f"where {cond}; {tail}"


def _trending_fields_with_demographics(use_demographics: bool, with_genres: bool) -> str:
    base = FIELDS_GAMES_LIST_WITH_GENRES if with_genres else FIELDS_GAMES_LIST
    if not use_demographics:
        return base
    return base.rstrip(";") + FIELDS_IGDB_DEMOGRAPHICS_SUFFIX + ";"


def trending_fetch_games_array(
    igdb_request: IgdbRequestFn,
    genre_ids: list[int],
    platform_ids: list[int],
    sort: str,
    limit: int,
    offset: int,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> list:
    use_demo = _has_demographic_filters(min_age, min_players, max_players)
    sort_clause = TRENDING_SORTS.get(sort, "where total_rating_count > 0; sort total_rating_count desc;")
    merged_clause = merge_trending_where_with_filters(sort_clause, genre_ids, platform_ids)

    # Cas historique : un seul genre, pas de plateforme, pas de filtre numérique → tri pure/mixed
    if len(genre_ids) == 1 and not platform_ids and not use_demo:
        need = offset + limit
        query = (
            f"{FIELDS_GAMES_LIST_WITH_GENRES}"
            f"where genres = ({genre_ids[0]}) & total_rating_count > 0; "
            f"sort total_rating_count desc; limit {min(need, 50)};"
        )
        raw = igdb_response_as_list(igdb_request("games", query))
        pure = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) == 1]
        mixed = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) != 1]
        return (pure + mixed)[offset : offset + limit]

    if use_demo:
        raw_cap = min(max((offset + limit) * 5, 50), 200)
        fields = _trending_fields_with_demographics(True, bool(genre_ids))
        query = f"{fields} {merged_clause} limit {raw_cap}; offset 0;"
        raw = igdb_response_as_list(igdb_request("games", query))
        raw = filter_games_raw_by_demographics(igdb_request, raw, min_age, min_players, max_players)
        return raw[offset : offset + limit]

    fields = _trending_fields_with_demographics(False, bool(genre_ids))
    query = f"{fields} {merged_clause} limit {limit}; offset {offset};"
    return igdb_response_as_list(igdb_request("games", query))


def trending_fetch_total_count(
    igdb_request: IgdbRequestFn,
    genre_ids: list[int],
    platform_ids: list[int],
    sort: str,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> int:
    try:
        use_demo = _has_demographic_filters(min_age, min_players, max_players)
        sort_clause = TRENDING_SORTS.get(sort, "where total_rating_count > 0; sort total_rating_count desc;")
        merged_clause = merge_trending_where_with_filters(sort_clause, genre_ids, platform_ids)
        where_part = merged_clause.split("sort")[0].strip()

        if use_demo:
            raw_cap = 200
            fields_full = _trending_fields_with_demographics(True, bool(genre_ids))
            query = f"{fields_full} {where_part} limit {raw_cap};"
            raw = igdb_response_as_list(igdb_request("games", query))
            filtered = filter_games_raw_by_demographics(igdb_request, raw, min_age, min_players, max_players)
            return len(filtered)

        query = f"fields id; {where_part} limit 500;"
        raw = igdb_response_as_list(igdb_request("games", query))
        return len(raw)
    except Exception:
        return 0


def trending_enrich_for_response(arr: list, enrich: bool, enrich_fn, user=None) -> list:
    """`enrich_fn` est passé par la vue (pour que les monkeypatch sur views_igdb s'appliquent)."""
    if enrich:
        enriched = enrich_fn(arr)
        return enrich_normalized_games(enriched, user)

    normalized = [
        normalize_igdb_game(
            {
                **g,
                "display_name": g.get("name") or "",
                "name_fr": None,
                "name_en": (g.get("name") or "").strip(),
            }
        )
        for g in arr
    ]
    return enrich_normalized_games(normalized, user)


# --- IgdbSearchView ---


def _rating_desc_key(g: dict) -> float:
    return -(g.get("total_rating_count") or 0)


def _apply_raw_list_filters(
    igdb_request: IgdbRequestFn,
    games: list,
    genre_ids: list[int],
    platform_ids: list[int],
    min_age: int | None,
    min_players: int | None,
    max_players: int | None,
) -> list:
    out = filter_raw_games_by_genre_platform_ids(games, genre_ids, platform_ids)
    return filter_games_raw_by_demographics(igdb_request, out, min_age, min_players, max_players)


def _top_rated_games(games: list, limit: int) -> list:
    return sorted(
        [g for g in games if (g.get("total_rating_count") or 0) > 0],
        key=_rating_desc_key,
    )[:limit]


def _merge_unique_games_by_id(first: list, second: list) -> list:
    seen: set[int] = set()
    merged: list = []
    for g in first:
        gid = g.get("id")
        if gid is not None and gid not in seen:
            seen.add(gid)
            merged.append(g)
    for g in second:
        gid = g.get("id")
        if gid is not None and gid not in seen:
            seen.add(gid)
            merged.append(g)
    return merged


def igdb_search_suggest_results(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
    genre_ids: list[int] | None = None,
    platform_ids: list[int] | None = None,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> list:
    genre_ids = genre_ids or []
    platform_ids = platform_ids or []
    use_demo = _has_demographic_filters(min_age, min_players, max_players)
    fetch_limit = max(limit * 4, 50) if (use_demo or genre_ids or platform_ids) else limit
    fields = _search_games_fields_for_list(genre_ids, use_demo)
    core = f'name ~ *"{q_esc}"* & total_rating_count > 0'
    where_line = merge_igdb_where_predicates(core, genre_ids, platform_ids)
    name_query = f"{fields} {where_line}; sort total_rating_count desc; limit {fetch_limit};"
    search_query = f'{fields} search "{q_esc}"; limit 50;'
    name_results: list = []
    search_results: list = []
    try:
        name_results = igdb_request("games", name_query)
    except Exception:
        pass
    try:
        search_results = igdb_request("games", search_query)
    except Exception:
        pass
    name_results = igdb_response_as_list(name_results)
    search_results = igdb_response_as_list(search_results)
    merged = _merge_unique_games_by_id(name_results, search_results)
    merged = _apply_raw_list_filters(igdb_request, merged, genre_ids, platform_ids, min_age, min_players, max_players)
    arr = _top_rated_games(merged, limit)
    if not arr and q_norm_esc != q_esc:
        # Comportement historique : un seul appel IGDB (search normalisé), pour garder 3 requêtes max
        # sur le chemin suggest + requête accentuée (cf. tests d’intégration).
        fallback_query = f'{fields} search "{q_norm_esc}"; limit 50;'
        try:
            fallback = igdb_response_as_list(igdb_request("games", fallback_query))
            merged2 = _apply_raw_list_filters(igdb_request, fallback, genre_ids, platform_ids, min_age, min_players, max_players)
            arr = _top_rated_games(merged2, limit)
        except Exception:
            pass
    return arr


def igdb_search_non_suggest_results(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
    genre_ids: list[int] | None = None,
    platform_ids: list[int] | None = None,
    min_age: int | None = None,
    min_players: int | None = None,
    max_players: int | None = None,
) -> list:
    genre_ids = genre_ids or []
    platform_ids = platform_ids or []
    use_demo = _has_demographic_filters(min_age, min_players, max_players)
    fetch_limit = max(limit * 4, 50) if (use_demo or genre_ids or platform_ids) else limit
    fields = _search_games_fields_for_list(genre_ids, use_demo)
    query = f'{fields} search "{q_esc}"; limit {fetch_limit};'
    arr = igdb_response_as_list(igdb_request("games", query))
    if not arr and q_norm_esc != q_esc:
        query = f'{fields} search "{q_norm_esc}"; limit {fetch_limit};'
        arr = igdb_response_as_list(igdb_request("games", query))
    arr = _apply_raw_list_filters(igdb_request, arr, genre_ids, platform_ids, min_age, min_players, max_players)
    return arr[:limit]


# --- Franchises search ---


def franchises_collections_fetch_terms(
    igdb_request: IgdbRequestFn,
    terms: list[str],
) -> tuple[list, list]:
    all_franchises: list = []
    all_collections: list = []
    for term in terms:
        name_query = f'fields id, name; where name ~ *"{term}"*; limit 5;'
        try:
            f_data = igdb_request("franchises", name_query)
            all_franchises.extend(igdb_response_as_list(f_data))
        except Exception:
            pass
        try:
            c_data = igdb_request("collections", name_query)
            all_collections.extend(igdb_response_as_list(c_data))
        except Exception:
            pass
    return all_franchises, all_collections


def franchises_search_build_payload(all_franchises: list, all_collections: list) -> list:
    seen_f: set = set()
    seen_c: set = set()
    franchises: list = []
    for f in all_franchises:
        fid = f.get("id")
        if fid is not None and fid not in seen_f:
            seen_f.add(fid)
            franchises.append({"id": fid, "name": f.get("name", ""), "type": "franchise"})
    collections: list = []
    for c in all_collections:
        cid = c.get("id")
        if cid is not None and cid not in seen_c:
            seen_c.add(cid)
            collections.append({"id": cid, "name": c.get("name", ""), "type": "collection"})
    return franchises + collections


# --- Translate (MyMemory) ---


def split_sentences_for_translate(text: str) -> list[str]:
    out: list[str] = []
    start = 0
    n = len(text)
    i = 0
    while i < n:
        if text[i] in ".!?":
            i += 1
            while i < n and text[i] in " \t\n\r\f\v":
                i += 1
            out.append(text[start:i])
            start = i
        else:
            i += 1
    if start < n:
        out.append(text[start:])
    stripped = [p for p in out if p.strip()]
    return stripped if stripped else [text]


def remove_q_equals_artifact(s: str) -> str:
    parts: list[str] = []
    i = 0
    n = len(s)
    while i < n:
        if i + 1 < n and s[i] == "q" and s[i + 1] == "=" and (i == 0 or s[i - 1].isspace()) and i + 2 < n and not s[i + 2].isspace():
            i += 2
            continue
        parts.append(s[i])
        i += 1
    return "".join(parts)


def build_translate_chunks(text: str, max_len: int = 480) -> list[str]:
    sentences = split_sentences_for_translate(text)
    chunks: list[str] = []
    current = ""
    for s in sentences:
        if len(current + s) > max_len:
            if current.strip():
                chunks.append(current.strip())
            current = s
        else:
            current += s
    if current.strip():
        chunks.append(current.strip())
    if not chunks:
        chunks = [text[:max_len]]
    return chunks


def translate_chunks_mymemory(chunks: list[str]) -> str:
    translated_parts: list[str] = []
    for chunk in chunks:
        try:
            url = f"{MYMEMORY_URL}?{urlencode({'q': chunk, 'langpair': 'en|fr'})}"
            r = requests.get(url, headers={"User-Agent": "LudoKan/1.0"}, timeout=10)
            if r.ok:
                data = r.json()
                trans = (data or {}).get("responseData", {}).get("translatedText")
                if isinstance(trans, str) and trans.strip():
                    trans = remove_q_equals_artifact(trans).strip()
                    translated_parts.append(trans)
                    continue
            translated_parts.append(chunk)
        except Exception:
            translated_parts.append(chunk)
    result = " ".join(translated_parts)
    return remove_q_equals_artifact(result).strip()


def translate_request_body_to_french(text: str) -> str:
    if len(text) > MAX_TRANSLATE_TEXT_LEN:
        text = text[:MAX_TRANSLATE_TEXT_LEN]
    chunks = build_translate_chunks(text)
    return translate_chunks_mymemory(chunks)
