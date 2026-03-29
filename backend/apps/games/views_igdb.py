"""
Vues proxy IGDB : exposent les endpoints de recherche / trending / détails / traduction
pour le frontend, en s'appuyant sur igdb_client, igdb_wikidata et igdb_search.
Préfixe URL : api/igdb/
"""

import logging

from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games import igdb_client
from apps.games.igdb_normalizer import enrich_normalized_games, normalize_igdb_game
from apps.games.igdb_proxy_constants import FIELDS_GAME_DETAIL, TRENDING_CACHE_TTL
from apps.games.igdb_search import escape_igdb_string, normalize_query
from apps.games.igdb_wikidata import enrich_with_wikidata_display_name, wikidata_french_label_by_english_title_debug
from apps.games.views_igdb_helpers import (
    franchises_collections_fetch_terms,
    franchises_search_build_payload,
    igdb_search_non_suggest_results,
    igdb_search_suggest_results,
    parse_genre_id_param,
    search_page_fallback_search,
    search_page_name_matches,
    translate_request_body_to_french,
    trending_enrich_for_response,
    trending_fetch_games_array,
)


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
            query = "fields name,cover.url,first_release_date,summary,platforms.name;sort first_release_date desc;limit 10;"
            data = igdb_client.igdb_request("games", query)
            arr = [normalize_igdb_game(g) for g in data] if isinstance(data, list) else []
            return Response(enrich_normalized_games(arr, request.user))
        except Exception as e:
            if _is_igdb_unavailable(e):
                return Response([])
            return Response(
                {"error": "Erreur IGDB", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class IgdbTrendingView(APIView):
    """GET /api/igdb/trending/ — Jeux tendances (sort, limit, offset, genre). Cache Redis 2 min."""

    permission_classes = [AllowAny]

    def get(self, request):
        sort = request.query_params.get("sort", "popularity")
        limit = _clamp_limit(request.query_params.get("limit"), 1, 50)
        offset = _clamp_offset(request.query_params.get("offset"))
        genre_id = parse_genre_id_param(request.query_params.get("genre"))
        enrich = request.query_params.get("enrich", "1") != "0"

        cache_key = f"igdb:trending:{sort}:{limit}:{offset}:{genre_id or ''}:{enrich}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            arr = trending_fetch_games_array(igdb_client.igdb_request, genre_id, sort, limit, offset)
            enriched = trending_enrich_for_response(arr, enrich, enrich_with_wikidata_display_name, request.user)
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
                arr = igdb_search_suggest_results(igdb_client.igdb_request, q_esc, q_norm_esc, limit)
            else:
                arr = igdb_search_non_suggest_results(igdb_client.igdb_request, q_esc, q_norm_esc, limit)

            enriched = enrich_with_wikidata_display_name(arr)
            return Response(enrich_normalized_games(enriched, request.user))
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
            final_arr = enrich_normalized_games(enriched, request.user)
            return Response(final_arr[0])
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
            arr = [normalize_igdb_game(g) for g in data] if isinstance(data, list) else []
            return Response(enrich_normalized_games(arr, request.user))
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
            arr = [normalize_igdb_game(g) for g in data] if isinstance(data, list) else []
            return Response(enrich_normalized_games(arr, request.user))
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

        all_franchises, all_collections = franchises_collections_fetch_terms(igdb_client.igdb_request, terms)
        payload = franchises_search_build_payload(all_franchises, all_collections)
        return Response(payload)


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
            arr = search_page_name_matches(igdb_client.igdb_request, q_esc, q_norm_esc, limit, offset)
            if not arr and offset == 0:
                arr = search_page_fallback_search(igdb_client.igdb_request, q_esc, limit)
            enriched = enrich_with_wikidata_display_name(arr)
            return Response(enrich_normalized_games(enriched, request.user))
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
        translated = translate_request_body_to_french(text)
        return Response({"translated": translated})


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
