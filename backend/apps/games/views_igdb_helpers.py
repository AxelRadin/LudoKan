"""
Logique métier du proxy IGDB (hors classes APIView).

Les fonctions prennent `igdb_request` (bound method) pour que les tests qui
mockent `apps.games.views_igdb.igdb_client` restent valides.
"""

from __future__ import annotations

from typing import Any, Callable
from urllib.parse import urlencode

import requests

from apps.games.igdb_proxy_constants import (
    FIELDS_GAMES_LIST,
    FIELDS_GAMES_LIST_WITH_GENRES,
    FIELDS_GAMES_SEARCH,
    FIELDS_SEARCH_PAGE,
    MAX_TRANSLATE_TEXT_LEN,
    MYMEMORY_URL,
    TRENDING_SORTS,
)

IgdbRequestFn = Callable[[str, str], Any]


def igdb_response_as_list(data) -> list:
    return data if isinstance(data, list) else []


# --- Search-page ---


def search_page_name_matches(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
    offset: int,
) -> list:
    name_body = (
        f"{FIELDS_SEARCH_PAGE} "
        f'where name ~ *"{q_esc}"* & total_rating_count > 0; '
        f"sort total_rating_count desc; limit {limit}; offset {offset};"
    )
    arr = igdb_response_as_list(igdb_request("games", name_body))
    if not arr and q_norm_esc != q_esc:
        name_body = (
            f"{FIELDS_SEARCH_PAGE} "
            f'where name ~ *"{q_norm_esc}"* & total_rating_count > 0; '
            f"sort total_rating_count desc; limit {limit}; offset {offset};"
        )
        arr = igdb_response_as_list(igdb_request("games", name_body))
    return arr


def search_page_fallback_search(igdb_request: IgdbRequestFn, q_esc: str, limit: int) -> list:
    search_body = f'{FIELDS_SEARCH_PAGE} search "{q_esc}"; limit 50;'
    try:
        search_arr = igdb_response_as_list(igdb_request("games", search_body))
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


def trending_fetch_games_array(
    igdb_request: IgdbRequestFn,
    genre_id: int | None,
    sort: str,
    limit: int,
    offset: int,
) -> list:
    sort_clause = TRENDING_SORTS.get(sort, "where total_rating_count > 0; sort total_rating_count desc;")
    if genre_id is not None:
        need = offset + limit
        query = (
            f"{FIELDS_GAMES_LIST_WITH_GENRES}"
            f"where genres = ({genre_id}) & total_rating_count > 0; "
            f"sort total_rating_count desc; limit {min(need, 50)};"
        )
        raw = igdb_response_as_list(igdb_request("games", query))
        pure = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) == 1]
        mixed = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) != 1]
        return (pure + mixed)[offset : offset + limit]
    query = f"{FIELDS_GAMES_LIST} {sort_clause} limit {limit}; offset {offset};"
    return igdb_response_as_list(igdb_request("games", query))


def trending_enrich_for_response(arr: list, enrich: bool, enrich_fn) -> list:
    """`enrich_fn` est passé par la vue (pour que les monkeypatch sur views_igdb s'appliquent)."""
    if enrich:
        return enrich_fn(arr)
    return [
        {
            **g,
            "display_name": g.get("name") or "",
            "name_fr": None,
            "name_en": (g.get("name") or "").strip(),
        }
        for g in arr
    ]


# --- IgdbSearchView ---


def _rating_desc_key(g: dict) -> float:
    return -(g.get("total_rating_count") or 0)


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
) -> list:
    fields = FIELDS_GAMES_SEARCH
    name_query = f"{fields} " f'where name ~ *"{q_esc}"* & total_rating_count > 0; ' f"sort total_rating_count desc; limit {limit};"
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
    arr = sorted(
        [g for g in merged if (g.get("total_rating_count") or 0) > 0],
        key=_rating_desc_key,
    )[:limit]
    if not arr and q_norm_esc != q_esc:
        fallback_query = f'{fields} search "{q_norm_esc}"; limit 50;'
        try:
            fallback = igdb_response_as_list(igdb_request("games", fallback_query))
            arr = sorted(fallback, key=_rating_desc_key)[:limit]
        except Exception:
            pass
    return arr


def igdb_search_non_suggest_results(
    igdb_request: IgdbRequestFn,
    q_esc: str,
    q_norm_esc: str,
    limit: int,
) -> list:
    fields = FIELDS_GAMES_SEARCH
    query = f'{fields} search "{q_esc}"; limit {limit};'
    arr = igdb_response_as_list(igdb_request("games", query))
    if not arr and q_norm_esc != q_esc:
        query = f'{fields} search "{q_norm_esc}"; limit {limit};'
        arr = igdb_response_as_list(igdb_request("games", query))
    return arr


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
            url = f"{MYMEMORY_URL}?q={urlencode({'q': chunk})}&langpair=en|fr"
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
