"""
Vues proxy IGDB : exposent les endpoints de recherche / trending / détails / traduction
pour le frontend, en s'appuyant sur igdb_client, igdb_wikidata et igdb_search.
Préfixe URL : api/igdb/
"""

import logging
import re
import time
from urllib.parse import urlencode

import requests
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games import igdb_client
from apps.games.igdb_search import escape_igdb_string, normalize_query
from apps.games.igdb_wikidata import enrich_with_wikidata_display_name, wikidata_french_label_by_english_title_debug

# Champs IGDB communs pour les listes de jeux
FIELDS_GAMES_LIST = "fields name,cover.url,first_release_date,summary,platforms.name," "total_rating,total_rating_count;"
FIELDS_GAMES_LIST_WITH_GENRES = "fields name,cover.url,first_release_date,summary,platforms.name," "total_rating,total_rating_count,genres;"
FIELDS_GAMES_SEARCH = (
    "fields name,cover.url,first_release_date,summary,platforms.name,"
    "total_rating,total_rating_count,alternative_names.name,"
    "game_localizations.name,game_localizations.region.name,"
    "franchises.id,franchises.name,collections.id,collections.name;"
)
FIELDS_GAME_DETAIL = (
    "fields name,cover.url,first_release_date,summary,platforms.name,genres.name,"
    "total_rating,total_rating_count,collections.id,collections.name,"
    "franchises.id,franchises.name;"
)
FIELDS_SEARCH_PAGE = "fields name,cover.url,first_release_date,platforms.name,total_rating,total_rating_count;"

NOW = int(time.time())
TRENDING_SORTS = {
    "popularity": "where total_rating_count > 0; sort total_rating_count desc;",
    "rating": "where total_rating_count > 50 & total_rating != null; sort total_rating desc;",
    "recent": f"where first_release_date < {NOW} & first_release_date > 0 & total_rating_count > 0; sort first_release_date desc;",
    "most_rated": "where total_rating_count > 100 & total_rating != null; sort total_rating_count desc;",
}
MYMEMORY_URL = "https://api.mymemory.translated.net/get"


def _clamp_limit(limit_raw, min_val=1, max_val=50):
    return min(max(int(limit_raw or min_val), min_val), max_val)


def _clamp_limit_200(limit_raw, min_val=1, max_val=200):
    return min(max(int(limit_raw or min_val), min_val), max_val)


def _clamp_offset(offset_raw):
    return max(int(offset_raw or 0), 0)


def _is_igdb_unavailable(exc):
    """True si l'erreur vient de l'auth/config IGDB (401, token, config)."""
    if isinstance(exc, ImproperlyConfigured):
        return True
    msg = str(exc).lower()
    return "igdb error 401" in msg or "authorization failure" in msg or "improperlyconfigured" in msg


class IgdbGamesListView(APIView):
    """GET /api/igdb/games/ — Liste de jeux (ex. 10 derniers)."""

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            query = "fields name,cover.url,first_release_date,summary,platforms.name;" "sort first_release_date desc;" "limit 10;"
            data = igdb_client.igdb_request("games", query)
            return Response(data if isinstance(data, list) else [])
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


TRENDING_CACHE_TTL = 120  # secondes (2 min)


class IgdbTrendingView(APIView):
    """GET /api/igdb/trending/ — Jeux tendances (sort, limit, offset, genre). Cache Redis 2 min."""

    permission_classes = [AllowAny]

    def get(self, request):
        sort = request.query_params.get("sort", "popularity")
        limit = _clamp_limit(request.query_params.get("limit"), 1, 50)
        offset = _clamp_offset(request.query_params.get("offset"))
        genre_id = request.query_params.get("genre")
        try:
            genre_id = int(genre_id) if genre_id is not None else None
        except (TypeError, ValueError):
            genre_id = None
        enrich = request.query_params.get("enrich", "1") != "0"

        cache_key = f"igdb:trending:{sort}:{limit}:{offset}:{genre_id or ''}:{enrich}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        sort_clause = TRENDING_SORTS.get(sort, "where total_rating_count > 0; sort total_rating_count desc;")
        try:
            if genre_id is not None:
                need = offset + limit
                query = (
                    f"{FIELDS_GAMES_LIST_WITH_GENRES}"
                    f"where genres = ({genre_id}) & total_rating_count > 0; "
                    f"sort total_rating_count desc; limit {min(need, 50)};"
                )
                raw = igdb_client.igdb_request("games", query)
                raw = raw if isinstance(raw, list) else []
                pure = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) == 1]
                mixed = [g for g in raw if (g.get("genres") or []) and len(g["genres"]) != 1]
                arr = (pure + mixed)[offset : offset + limit]
            else:
                query = f"{FIELDS_GAMES_LIST} {sort_clause} limit {limit}; offset {offset};"
                arr = igdb_client.igdb_request("games", query)
                arr = arr if isinstance(arr, list) else []

            if enrich:
                enriched = enrich_with_wikidata_display_name(arr)
            else:
                enriched = [{**g, "display_name": g.get("name") or "", "name_fr": None, "name_en": (g.get("name") or "").strip()} for g in arr]
            cache.set(cache_key, enriched, TRENDING_CACHE_TTL)
            return Response(enriched)
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.exception("IGDB trending error: %s", e)
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB trending", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbSearchView(APIView):
    """GET /api/igdb/search/ — Recherche IGDB (q, limit, suggest)."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing query param: q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        suggest = (request.query_params.get("suggest") or "0") == "1"
        limit = _clamp_limit(request.query_params.get("limit"), 1, 50)

        q_esc = escape_igdb_string(q)
        q_norm = normalize_query(q)
        q_norm_esc = escape_igdb_string(q_norm)

        try:
            if suggest:
                name_query = (
                    f"{FIELDS_GAMES_SEARCH} " f'where name ~ *"{q_esc}"* & total_rating_count > 0; ' f"sort total_rating_count desc; limit {limit};"
                )
                search_query = f'{FIELDS_GAMES_SEARCH} search "{q_esc}"; limit 50;'
                name_results = []
                search_results = []
                try:
                    name_results = igdb_client.igdb_request("games", name_query)
                except Exception:
                    pass
                try:
                    search_results = igdb_client.igdb_request("games", search_query)
                except Exception:
                    pass
                name_results = name_results if isinstance(name_results, list) else []
                search_results = search_results if isinstance(search_results, list) else []

                seen = set()
                merged = []
                for g in name_results:
                    gid = g.get("id")
                    if gid is not None and gid not in seen:
                        seen.add(gid)
                        merged.append(g)
                for g in search_results:
                    gid = g.get("id")
                    if gid is not None and gid not in seen:
                        seen.add(gid)
                        merged.append(g)
                arr = sorted(
                    [g for g in merged if (g.get("total_rating_count") or 0) > 0],
                    key=lambda g: -(g.get("total_rating_count") or 0),
                )[:limit]

                if not arr and q_norm_esc != q_esc:
                    fallback_query = f'{FIELDS_GAMES_SEARCH} search "{q_norm_esc}"; limit 50;'
                    try:
                        fallback = igdb_client.igdb_request("games", fallback_query)
                        fallback = fallback if isinstance(fallback, list) else []
                        arr = sorted(
                            fallback,
                            key=lambda g: -(g.get("total_rating_count") or 0),
                        )[:limit]
                    except Exception:
                        pass
            else:
                query = f'{FIELDS_GAMES_SEARCH} search "{q_esc}"; limit {limit};'
                arr = igdb_client.igdb_request("games", query)
                arr = arr if isinstance(arr, list) else []
                if not arr and q_norm_esc != q_esc:
                    query = f'{FIELDS_GAMES_SEARCH} search "{q_norm_esc}"; limit {limit};'
                    arr = igdb_client.igdb_request("games", query)
                    arr = arr if isinstance(arr, list) else []

            enriched = enrich_with_wikidata_display_name(arr)
            return Response(enriched)
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB search", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbGameDetailView(APIView):
    """GET /api/igdb/games/<id>/ — Détail d'un jeu par ID IGDB."""

    permission_classes = [AllowAny]

    def get(self, request, id):
        try:
            igdb_id = int(id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid game id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            query = f"{FIELDS_GAME_DETAIL} where id = {igdb_id}; limit 1;"
            data = igdb_client.igdb_request("games", query)
            arr = data if isinstance(data, list) else []
            if not arr:
                return Response(
                    {"error": "Game not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            enriched = enrich_with_wikidata_display_name(arr)
            return Response(enriched[0])
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response(
                    {"error": "Game not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"error": "Erreur IGDB", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbCollectionGamesView(APIView):
    """GET /api/igdb/collections/<id>/games/ — Jeux d'une collection."""

    permission_classes = [AllowAny]

    def get(self, request, id):
        try:
            collection_id = int(id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid collection id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = _clamp_limit_200(request.query_params.get("limit"), 1, 200)
        offset = _clamp_offset(request.query_params.get("offset"))
        try:
            query = (
                "fields name,cover.url,first_release_date,summary,platforms.name,"
                "total_rating,total_rating_count,collections.id,collections.name;"
                f"where collections = ({collection_id});"
                "sort total_rating_count desc;"
                f"limit {limit}; offset {offset};"
            )
            data = igdb_client.igdb_request("games", query)
            return Response(data if isinstance(data, list) else [])
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB collection", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbFranchiseGamesView(APIView):
    """GET /api/igdb/franchises/<id>/games/ — Jeux d'une franchise."""

    permission_classes = [AllowAny]

    def get(self, request, id):
        try:
            franchise_id = int(id)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid franchise id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = _clamp_limit_200(request.query_params.get("limit"), 1, 200)
        offset = _clamp_offset(request.query_params.get("offset"))
        try:
            query = (
                "fields name,cover.url,first_release_date,summary,platforms.name,"
                "total_rating,total_rating_count,franchises.id,franchises.name;"
                f"where franchises = ({franchise_id});"
                "sort total_rating_count desc;"
                f"limit {limit}; offset {offset};"
            )
            data = igdb_client.igdb_request("games", query)
            return Response(data if isinstance(data, list) else [])
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB franchise", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbFranchisesSearchView(APIView):
    """GET /api/igdb/franchises/ — Recherche franchises + collections (param q)."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        q_esc = escape_igdb_string(q)
        q_norm_esc = escape_igdb_string(normalize_query(q))
        terms = [q_esc] if q_norm_esc == q_esc else [q_esc, q_norm_esc]

        all_franchises = []
        all_collections = []
        for term in terms:
            name_query = f'fields id, name; where name ~ *"{term}"*; limit 5;'
            try:
                f_data = igdb_client.igdb_request("franchises", name_query)
                all_franchises.extend(f_data if isinstance(f_data, list) else [])
            except Exception:
                pass
            try:
                c_data = igdb_client.igdb_request("collections", name_query)
                all_collections.extend(c_data if isinstance(c_data, list) else [])
            except Exception:
                pass

        seen_f = set()
        seen_c = set()
        franchises = []
        for f in all_franchises:
            fid = f.get("id")
            if fid is not None and fid not in seen_f:
                seen_f.add(fid)
                franchises.append({"id": fid, "name": f.get("name", ""), "type": "franchise"})
        collections = []
        for c in all_collections:
            cid = c.get("id")
            if cid is not None and cid not in seen_c:
                seen_c.add(cid)
                collections.append({"id": cid, "name": c.get("name", ""), "type": "collection"})
        return Response(franchises + collections)


class IgdbSearchPageView(APIView):
    """GET /api/igdb/search-page/ — Recherche paginée par nom (q, limit, offset)."""

    permission_classes = [AllowAny]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = _clamp_limit(request.query_params.get("limit"), 1, 50)
        offset = _clamp_offset(request.query_params.get("offset"))
        q_esc = escape_igdb_string(q)
        q_norm_esc = escape_igdb_string(normalize_query(q))

        try:
            name_body = (
                f"{FIELDS_SEARCH_PAGE} "
                f'where name ~ *"{q_esc}"* & total_rating_count > 0; '
                f"sort total_rating_count desc; limit {limit}; offset {offset};"
            )
            arr = igdb_client.igdb_request("games", name_body)
            arr = arr if isinstance(arr, list) else []

            if not arr and q_norm_esc != q_esc:
                name_body = (
                    f"{FIELDS_SEARCH_PAGE} "
                    f'where name ~ *"{q_norm_esc}"* & total_rating_count > 0; '
                    f"sort total_rating_count desc; limit {limit}; offset {offset};"
                )
                arr = igdb_client.igdb_request("games", name_body)
                arr = arr if isinstance(arr, list) else []

            if not arr and offset == 0:
                search_body = f'{FIELDS_SEARCH_PAGE} search "{q_esc}"; limit 50;'
                try:
                    search_arr = igdb_client.igdb_request("games", search_body)
                    search_arr = search_arr if isinstance(search_arr, list) else []
                    arr = sorted(
                        search_arr,
                        key=lambda g: -(g.get("total_rating_count") or 0),
                    )[:limit]
                except Exception:
                    pass

            enriched = enrich_with_wikidata_display_name(arr)
            return Response(enriched)
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur search-page", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbTranslateView(APIView):
    """POST /api/igdb/translate/ — Traduction EN → FR via MyMemory."""

    permission_classes = [AllowAny]

    def post(self, request):
        text = (request.data.get("text") if isinstance(request.data, dict) else None) or ""
        if not text.strip():
            return Response(
                {"error": "Missing text"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sentences = re.findall(r"[^.!?]+[.!?]+\s*", text) or [text]
        chunks = []
        current = ""
        max_len = 480
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

        translated_parts = []
        for chunk in chunks:
            try:
                url = f"{MYMEMORY_URL}?q={urlencode({'q': chunk})}&langpair=en|fr"
                r = requests.get(url, headers={"User-Agent": "LudoKan/1.0"}, timeout=10)
                if r.ok:
                    data = r.json()
                    trans = (data or {}).get("responseData", {}).get("translatedText")
                    if isinstance(trans, str) and trans.strip():
                        trans = re.sub(r"(^|\s)q=(?=\S)", r"\1", trans).strip()
                        translated_parts.append(trans)
                        continue
                translated_parts.append(chunk)
            except Exception:
                translated_parts.append(chunk)
        result = " ".join(translated_parts)
        # Nettoyage global au cas où "q=" apparaîtrait en début de phrase
        result = re.sub(r"(^|\s)q=(?=\S)", r"\1", result).strip()
        return Response({"translated": result})


class IgdbWikidataTestView(APIView):
    """GET /api/igdb/wikidata-test/?nameEn=... — Debug Wikidata (à n'utiliser qu'en DEBUG)."""

    permission_classes = [AllowAny]

    def get(self, request):
        from django.conf import settings

        if not settings.DEBUG:
            return Response(
                {"error": "Endpoint available only in DEBUG"},
                status=status.HTTP_404_NOT_FOUND,
            )
        name_en = (request.query_params.get("nameEn") or "").strip()
        if not name_en:
            return Response(
                {"error": "Missing query param: nameEn"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            fr = wikidata_french_label_by_english_title_debug(name_en)
            return Response({"name_en": name_en, "name_fr": fr})
        except Exception as e:
            return Response(
                {"error": "wikidata test failed", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
