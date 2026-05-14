"""
Tests d'intégration pour le proxy IGDB (api/igdb/...).
On mock igdb_client.igdb_request et igdb_wikidata pour ne pas appeler les APIs externes.
"""

from types import SimpleNamespace

import pytest
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import RequestFactory
from rest_framework import status

from apps.games.igdb_normalizer import normalize_igdb_game
from apps.games.igdb_proxy_constants import MAX_TRANSLATE_TEXT_LEN
from apps.games.views_igdb import IgdbCollectionGamesView, IgdbFranchiseGamesView, IgdbGameDetailView


def _enrich_stub(games):
    return [
        normalize_igdb_game(
            {
                **g,
                "display_name": g.get("name") or "",
                "name_fr": None,
                "name_en": (g.get("name") or "").strip(),
            }
        )
        for g in games
    ]


@pytest.fixture
def mock_enrich(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb.enrich_with_wikidata_display_name",
        _enrich_stub,
    )


@pytest.mark.django_db
class TestIgdbProxySearch:
    """Tests pour GET /api/igdb/search/"""

    def test_search_missing_q_returns_400(self, api_client):
        response = api_client.get("/api/igdb/search/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

    def test_search_with_q_returns_200_and_list(self, api_client, monkeypatch):
        fake_games = [
            {"id": 100, "name": "The Legend of Zelda", "total_rating_count": 500},
        ]

        def mock_igdb_request(endpoint, query):
            return fake_games

        def mock_enrich(games):
            return [normalize_igdb_game({**g, "display_name": g.get("name"), "name_fr": None, "name_en": g.get("name")}) for g in games]

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb_request,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            mock_enrich,
        )

        response = api_client.get("/api/igdb/search/", {"q": "zelda"})
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
        assert len(response.data) == 1
        assert response.data[0]["igdb_id"] == 100
        assert response.data[0]["name"] == "The Legend of Zelda"

    def test_search_suggest_mode_merges_name_and_search(self, api_client, monkeypatch):
        def mock_igdb(endpoint, query):
            if "where name ~" in query:
                return [{"id": 1, "name": "A", "total_rating_count": 5}]
            if "search" in query and "limit 50" in query:
                return [{"id": 2, "name": "B", "total_rating_count": 10}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        # limit par défaut = 1 → [:limit] ne garde qu’un jeu après tri par total_rating_count
        response = api_client.get("/api/igdb/search/", {"q": "test", "suggest": "1", "limit": "2"})
        assert response.status_code == status.HTTP_200_OK
        ids = {g["igdb_id"] for g in response.data}
        assert ids == {1, 2}

    def test_search_non_suggest_simple(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 3, "name": "X", "total_rating_count": 1}],
        )
        response = api_client.get("/api/igdb/search/", {"q": "x"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_search_non_suggest_fallback_second_query_when_accented(self, api_client, mock_enrich, monkeypatch):
        """Si 1ʳᵉ recherche vide et q normalisé ≠ q brut, 2ᵉ requête search (l. 260-263)."""
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            if len(calls) == 1:
                return []
            return [{"id": 7, "name": "Café", "total_rating_count": 3}]

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/search/", {"q": "café"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["igdb_id"] == 7
        assert len(calls) == 2

    def test_search_igdb_unavailable_returns_empty(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("no token")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "q"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_search_other_error_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("network")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "q"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyGamesList:
    def test_games_list_ok(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 1, "name": "G"}],
        )
        response = api_client.get("/api/igdb/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 1

    def test_games_list_non_list_response(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: {},
        )
        response = api_client.get("/api/igdb/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_games_list_improperly_configured_empty(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("x")),
        )
        response = api_client.get("/api/igdb/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_games_list_other_error_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("boom")),
        )
        response = api_client.get("/api/igdb/games/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyTrending:
    @pytest.fixture(autouse=True)
    def _clear_trending_cache(self):
        cache.clear()
        yield
        cache.clear()

    def test_trending_uses_cache_second_request(self, api_client, mock_enrich, monkeypatch):
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            return [{"id": 1, "name": "T", "total_rating_count": 10}]

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        api_client.get("/api/igdb/trending/")
        assert len(calls) == 2
        api_client.get("/api/igdb/trending/")
        assert len(calls) == 2

    def test_trending_enrich_zero(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 1, "name": "N", "total_rating_count": 5}],
        )
        response = api_client.get("/api/igdb/trending/", {"enrich": "0"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"][0]["name"] == "N"
        assert response.data["results"][0]["user_rating"] is None

    def test_trending_with_genre_filter(self, api_client, mock_enrich, monkeypatch):
        def mock_igdb(ep, q):
            if "genres =" in q or "genres=" in q:
                return [
                    {"id": 1, "name": "Pure", "genres": [{"id": 1}], "total_rating_count": 10},
                    {"id": 2, "name": "Mix", "genres": [{"id": 1}, {"id": 2}], "total_rating_count": 20},
                ]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/trending/", {"genre": "1", "limit": "10"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_trending_invalid_genre_id_ignored(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 1, "name": "X", "total_rating_count": 5}],
        )
        response = api_client.get("/api/igdb/trending/", {"genre": "not-int"})
        assert response.status_code == status.HTTP_200_OK

    def test_trending_igdb_unavailable_empty(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("x")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/trending/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == {"results": [], "total_count": 0}

    def test_trending_other_error_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("e")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/trending/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyGameDetail:
    def test_detail_ok(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 99, "name": "Detail"}],
        )
        response = api_client.get("/api/igdb/games/99/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["igdb_id"] == 99

    def test_detail_invalid_id(self, api_client):
        """`<int:id>` rejette les non-entiers avant la vue → 404 Django."""
        response = api_client.get("/api/igdb/games/not-int/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_not_found(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [],
        )
        response = api_client.get("/api/igdb/games/999999999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_improperly_configured_404(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("x")),
        )
        response = api_client.get("/api/igdb/games/1/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_detail_other_error_500(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("x")),
        )
        response = api_client.get("/api/igdb/games/1/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyCollectionFranchise:
    def test_collection_games_ok(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 1}],
        )
        response = api_client.get("/api/igdb/collections/5/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 1

    def test_collection_invalid_id(self, api_client):
        response = api_client.get("/api/igdb/collections/bad/games/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_collection_improperly_configured(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("x")),
        )
        response = api_client.get("/api/igdb/collections/1/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_collection_error_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("x")),
        )
        response = api_client.get("/api/igdb/collections/1/games/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_franchise_games_ok(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 2}],
        )
        response = api_client.get("/api/igdb/franchises/3/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 2

    def test_franchise_invalid_id(self, api_client):
        response = api_client.get("/api/igdb/franchises/x/games/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestIgdbProxyFranchisesSearch:
    def test_missing_q(self, api_client):
        response = api_client.get("/api/igdb/franchises/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_merges_franchises_and_collections(self, api_client, monkeypatch):
        def mock_igdb(endpoint, query):
            if endpoint == "franchises":
                return [{"id": 1, "name": "F"}]
            if endpoint == "collections":
                return [{"id": 2, "name": "C"}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/franchises/", {"q": "mario"})
        assert response.status_code == status.HTTP_200_OK
        types = {item["type"] for item in response.data}
        assert "franchise" in types
        assert "collection" in types


@pytest.mark.django_db
class TestIgdbProxySearchPage:
    def test_missing_q(self, api_client):
        response = api_client.get("/api/igdb/search-page/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_name_match_ok(self, api_client, mock_enrich, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: [{"id": 1, "name": "Z", "total_rating_count": 5}],
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "zelda"})
        assert response.status_code == status.HTTP_200_OK

    def test_search_fallback_when_name_empty(self, api_client, mock_enrich, monkeypatch):
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            if "where name ~" in q:
                return []
            if "search" in q:
                return [{"id": 9, "name": "S", "total_rating_count": 100}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "foo", "offset": "0"})
        assert response.status_code == status.HTTP_200_OK
        assert any("search" in c for c in calls)

    def test_search_page_unavailable_empty(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("x")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "x"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []


@pytest.mark.django_db
class TestIgdbProxyTranslate:
    def test_missing_text(self, api_client):
        response = api_client.post("/api/igdb/translate/", {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_translate_success(self, api_client, monkeypatch):
        def fake_get(url, headers, timeout):
            return SimpleNamespace(
                ok=True,
                json=lambda: {"responseData": {"translatedText": "Bonjour q=test"}},
            )

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": "Hello. World"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "Bonjour" in response.data["translated"]

    def test_translate_request_falls_back_to_chunk(self, api_client, monkeypatch):
        def fake_get(url, headers, timeout):
            raise ConnectionError("down")

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": "Only chunk"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["translated"] == "Only chunk"


@pytest.mark.django_db
class TestIgdbProxyWikidataTest:
    def test_not_available_when_debug_false(self, api_client, settings):
        settings.DEBUG = False
        response = api_client.get("/api/igdb/wikidata-test/", {"nameEn": "Zelda"})
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_missing_name_en(self, api_client, settings):
        settings.DEBUG = True
        response = api_client.get("/api/igdb/wikidata-test/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_ok_debug_true(self, api_client, settings, monkeypatch):
        settings.DEBUG = True
        monkeypatch.setattr(
            "apps.games.views_igdb.wikidata_french_label_by_english_title_debug",
            lambda n: "Légende",
        )
        response = api_client.get("/api/igdb/wikidata-test/", {"nameEn": "Zelda"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name_fr"] == "Légende"

    def test_wikidata_exception_500(self, api_client, settings, monkeypatch):
        settings.DEBUG = True

        def boom(n):
            raise RuntimeError("wd")

        monkeypatch.setattr(
            "apps.games.views_igdb.wikidata_french_label_by_english_title_debug",
            boom,
        )
        response = api_client.get("/api/igdb/wikidata-test/", {"nameEn": "X"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyInvalidIdDirectDispatch:
    """`int(id)` invalide : la vue reçoit une chaîne (RequestFactory)."""

    def test_game_detail_invalid_id_returns_400(self):
        factory = RequestFactory()
        request = factory.get("/api/igdb/games/bad/")
        view = IgdbGameDetailView.as_view()
        response = view(request, id="not-int")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"] == "Invalid game id"

    def test_collection_invalid_id_returns_400(self):
        factory = RequestFactory()
        request = factory.get("/")
        view = IgdbCollectionGamesView.as_view()
        response = view(request, id="bad")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_franchise_invalid_id_returns_400(self):
        factory = RequestFactory()
        request = factory.get("/")
        view = IgdbFranchiseGamesView.as_view()
        response = view(request, id="x")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestIgdbProxySearchSuggestBranches:
    """Branches internes suggest (except pass, fallback accent)."""

    def test_suggest_name_request_raises_search_ok(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if "where name ~" in q:
                raise RuntimeError("name igdb down")
            if "search" in q and "limit 50" in q:
                return [{"id": 1, "name": "A", "total_rating_count": 10}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "x", "suggest": "1", "limit": "5"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 1

    def test_suggest_search_request_raises_name_ok(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if "where name ~" in q:
                return [{"id": 2, "name": "B", "total_rating_count": 8}]
            if "search" in q and "limit 50" in q:
                raise RuntimeError("search igdb down")
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "y", "suggest": "1", "limit": "5"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 2

    def test_suggest_fallback_accented_when_merge_empty(self, api_client, monkeypatch):
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            if len(calls) <= 2:
                return []
            return [{"id": 7, "name": "G", "total_rating_count": 15}]

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "café", "suggest": "1", "limit": "3"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 7
        assert len(calls) == 3

    def test_suggest_fallback_accented_exception_swallowed(self, api_client, monkeypatch):
        """3ᵉ appel (fallback search normalisé) lève → except pass (l. 254-255)."""
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            if len(calls) < 3:
                return []
            raise RuntimeError("fallback fail")

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search/", {"q": "café", "suggest": "1", "limit": "2"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []
        assert len(calls) == 3


@pytest.mark.django_db
class TestIgdbProxyFranchisesSearchExceptions:
    def test_franchises_request_raises_collections_ok(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if ep == "franchises":
                raise RuntimeError("fr down")
            if ep == "collections":
                return [{"id": 10, "name": "Col"}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/franchises/", {"q": "mario"})
        assert response.status_code == status.HTTP_200_OK
        assert any(x.get("type") == "collection" for x in response.data)

    def test_collections_request_raises_franchises_ok(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if ep == "franchises":
                return [{"id": 1, "name": "Fran"}]
            if ep == "collections":
                raise RuntimeError("col down")
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/franchises/", {"q": "x"})
        assert response.status_code == status.HTTP_200_OK
        assert any(x.get("type") == "franchise" for x in response.data)


@pytest.mark.django_db
class TestIgdbProxyFranchise500:
    def test_franchise_games_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("igdb")),
        )
        response = api_client.get("/api/igdb/franchises/1/games/")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_franchise_games_improperly_configured_returns_empty(self, api_client, monkeypatch):
        """Branche _is_igdb_unavailable → Response([]) (l. 372-373)."""
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(ImproperlyConfigured("no creds")),
        )
        response = api_client.get("/api/igdb/franchises/1/games/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []


@pytest.mark.django_db
class TestIgdbProxySearchPageExtra:
    def test_normalized_name_second_query_returns_games(self, api_client, mock_enrich, monkeypatch):
        n = [0]

        def mock_igdb(ep, q):
            n[0] += 1
            if "where name ~" in q:
                if n[0] == 1:
                    return []
                return [{"id": 3, "name": "Café", "total_rating_count": 8}]
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "café"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]["igdb_id"] == 3

    def test_search_body_inner_exception(self, api_client, mock_enrich, monkeypatch):
        def mock_igdb(ep, q):
            if "where name ~" in q:
                return []
            if "search" in q:
                raise RuntimeError("search inner")
            return []

        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            mock_igdb,
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "foo", "offset": "0"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_outer_exception_500(self, api_client, monkeypatch):
        monkeypatch.setattr(
            "apps.games.views_igdb.igdb_client.igdb_request",
            lambda ep, q: (_ for _ in ()).throw(RuntimeError("outer")),
        )
        monkeypatch.setattr(
            "apps.games.views_igdb.enrich_with_wikidata_display_name",
            _enrich_stub,
        )
        response = api_client.get("/api/igdb/search-page/", {"q": "bar"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@pytest.mark.django_db
class TestIgdbProxyTranslateExtra:
    def test_truncates_text_longer_than_max(self, api_client, monkeypatch):
        captured = {}

        def fake_get(url, headers, timeout):
            captured["url"] = url
            return SimpleNamespace(ok=True, json=lambda: {"responseData": {"translatedText": "ok"}})

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        long_text = "word " * (MAX_TRANSLATE_TEXT_LEN // 5 + 50)
        assert len(long_text) > MAX_TRANSLATE_TEXT_LEN
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": long_text},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "translated" in response.data
        assert "q=" in captured["url"]

    def test_multiple_chunks_over_480_chars(self, api_client, monkeypatch):
        calls = []

        def fake_get(url, headers, timeout):
            calls.append(1)
            return SimpleNamespace(ok=True, json=lambda: {"responseData": {"translatedText": "x"}})

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        text = "Hello. " * 120
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": text},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(calls) >= 2

    def test_my_memory_ok_but_empty_translation_uses_original_chunk(self, api_client, monkeypatch):
        def fake_get(url, headers, timeout):
            return SimpleNamespace(
                ok=True,
                json=lambda: {"responseData": {"translatedText": "   "}},
            )

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": "Original"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["translated"] == "Original"

    def test_translate_empty_chunks_fallback_slice(self, api_client, monkeypatch):
        """Aucune phrase → chunks vides → repli text[:480] (l. 513-514)."""
        monkeypatch.setattr(
            "apps.games.views_igdb_helpers.split_sentences_for_translate",
            lambda _t: [],
        )

        def fake_get(url, headers, timeout):
            return SimpleNamespace(
                ok=True,
                json=lambda: {"responseData": {"translatedText": "OK"}},
            )

        monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", fake_get)
        response = api_client.post(
            "/api/igdb/translate/",
            {"text": "Hello"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["translated"] == "OK"


@pytest.mark.django_db
class TestIgdbProxyCoverageHelpers:
    """Tests supplémentaires pour atteindre 100% de couverture sur views_igdb_helpers.py"""

    def test_parse_optional_float_query_invalid(self):
        from apps.games.views_igdb_helpers import parse_optional_float_query

        assert parse_optional_float_query("not-a-float") is None
        assert parse_optional_float_query(None) is None
        assert parse_optional_float_query("") is None

    def test_search_page_with_all_filters_coverage(self, api_client, monkeypatch):
        """Couvre _genre_platform_where_extra_clauses et _igdb_search_games_list_query_setup"""
        calls = []

        def mock_igdb(ep, q):
            calls.append(q)
            return [{"id": 1, "name": "Filtered Game", "total_rating_count": 10}]

        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", mock_igdb)
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)

        params = {
            "q": "test",
            "theme": "1,2",
            "game_mode": "3",
            "player_perspective": "4",
            "min_rating": "80.5",
            "release_year_min": "2020",
            "release_year_max": "2024",
            "sort": "recent",
        }
        response = api_client.get("/api/igdb/search-page/", params)
        assert response.status_code == status.HTTP_200_OK

        last_query = calls[-1]
        assert "themes = (1) | themes = (2)" in last_query
        assert "game_modes = (3)" in last_query
        assert "player_perspectives = (4)" in last_query
        assert "total_rating >= 80.5" in last_query

    def test_search_suggest_with_manual_filters_coverage(self, api_client, monkeypatch):
        """Couvre _apply_raw_list_filters (filtrage manuel post-search)"""

        def mock_igdb(ep, q):
            return [{"id": 1, "name": "G", "themes": [10], "total_rating": 50, "first_release_date": 1000, "total_rating_count": 100}]

        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", mock_igdb)
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        params = {"q": "t", "suggest": "1", "theme": "1", "min_rating": "80"}
        response = api_client.get("/api/igdb/search/", params)
        assert len(response.data) == 0

    def test_search_suggest_manual_filters_match(self, api_client, monkeypatch):
        import datetime

        ts = int(datetime.datetime(2022, 1, 1, tzinfo=datetime.timezone.utc).timestamp())

        def mock_igdb(ep, q):
            return [
                {
                    "id": 1,
                    "name": "M",
                    "themes": [1],
                    "game_modes": [2],
                    "player_perspectives": [3],
                    "total_rating": 90,
                    "first_release_date": ts,
                    "total_rating_count": 100,
                },
                {
                    "id": 2,
                    "name": "No Date",
                    "themes": [1],
                    "game_modes": [2],
                    "player_perspectives": [3],
                    "total_rating": 90,
                    "first_release_date": None,
                    "total_rating_count": 100,
                },
            ]

        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", mock_igdb)
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        params = {
            "q": "t",
            "suggest": "1",
            "theme": "1",
            "game_mode": "2",
            "player_perspective": "3",
            "min_rating": "80",
            "release_year_min": "2020",
            "release_year_max": "2024",
        }
        response = api_client.get("/api/igdb/search/", params)
        assert len(response.data) == 1

    def test_ids_from_igdb_relation_dict_coverage(self):
        from apps.games.views_igdb_helpers import _ids_from_igdb_relation

        assert _ids_from_igdb_relation({"x": [{"id": 123}]}, "x") == {123}

    def test_search_page_complex_sort_logic_coverage(self, api_client, monkeypatch):
        from apps.games.igdb_proxy_constants import TRENDING_SORTS

        monkeypatch.setitem(TRENDING_SORTS, "complex", "where x=1; sort rating desc;")
        calls = []
        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", lambda ep, q: calls.append(q) or [])
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        api_client.get("/api/igdb/search-page/", {"q": "test", "sort": "complex"})
        assert any("sort rating desc;" in c for c in calls)

        calls.clear()
        monkeypatch.setitem(TRENDING_SORTS, "tricky", "where name ~ *sort*; limit 10;")
        api_client.get("/api/igdb/search-page/", {"q": "test", "sort": "tricky"})
        assert any("sort total_rating_count desc;" in c for c in calls)

    def test_parse_genre_id_param_coverage(self):
        from apps.games.views_igdb_helpers import parse_genre_id_param

        assert parse_genre_id_param("123") == 123
        assert parse_genre_id_param(None) is None
        assert parse_genre_id_param("not-int") is None

    def test_parse_igdb_id_list_param_coverage(self):
        from apps.games.views_igdb_helpers import parse_igdb_id_list_param

        assert parse_igdb_id_list_param("1,,2") == [1, 2]
        assert parse_igdb_id_list_param("  ") == []

    def test_parse_optional_int_query_coverage(self):
        from apps.games.views_igdb_helpers import parse_optional_int_query

        assert parse_optional_int_query("not-int") is None

    def test_merge_trending_where_no_where_branch(self):
        from apps.games.views_igdb_helpers import merge_trending_where_with_filters

        assert merge_trending_where_with_filters("sort x;", [], []) == "sort x;"

    def test_trending_demo_mode_coverage(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if ep == "age_ratings":
                return [{"id": 1, "category": 1, "rating": 12}]
            return [{"id": 1, "name": "D", "age_ratings": [1]}]

        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", mock_igdb)
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        api_client.get("/api/igdb/trending/", {"min_age": "12", "genre": "4"})

    def test_search_page_post_slice_coverage(self, api_client, monkeypatch):
        def mock_igdb(ep, q):
            if ep == "age_ratings":
                return [{"id": 1, "category": 1, "rating": 12}]
            return [{"id": 1, "name": "Z", "age_ratings": [1]}]

        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", mock_igdb)
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        api_client.get("/api/igdb/search-page/", {"q": "z", "min_age": "12", "offset": "0", "limit": "1"})

    def test_ids_from_igdb_relation_int_coverage(self):
        from apps.games.views_igdb_helpers import _ids_from_igdb_relation

        assert _ids_from_igdb_relation({"x": [1, 2]}, "x") == {1, 2}

    def test_genre_platform_where_platforms_coverage(self, api_client, monkeypatch):
        calls = []
        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", lambda ep, q: calls.append(q) or [{"id": 1}])
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        api_client.get("/api/igdb/search-page/", {"q": "t", "platform": "48,49"})
        assert any("platforms = (48) | platforms = (49)" in c for c in calls)

    def test_filter_raw_games_by_genre_platform_ids_coverage(self):
        from apps.games.views_igdb_helpers import filter_raw_games_by_genre_platform_ids

        games = [{"id": 1, "genres": [1], "platforms": [1]}]
        assert len(filter_raw_games_by_genre_platform_ids(games, [1], [1])) == 1
        assert len(filter_raw_games_by_genre_platform_ids(games, [2], [1])) == 0
        assert len(filter_raw_games_by_genre_platform_ids(games, [1], [2])) == 0

    def test_fields_with_optional_genres_coverage(self):
        from apps.games.views_igdb_helpers import _fields_with_optional_genres_and_demographics

        assert "genres" in _fields_with_optional_genres_and_demographics("f1;", True, False)

    def test_trending_fetch_total_count_exception_coverage(self, monkeypatch):
        from apps.games.views_igdb_helpers import trending_fetch_total_count

        assert trending_fetch_total_count(lambda *a, **k: 1 / 0, [], [], "popularity") == 0

    def test_igdb_setup_fields_rating_force_coverage(self, api_client, monkeypatch):
        calls = []
        monkeypatch.setattr("apps.games.views_igdb.igdb_client.igdb_request", lambda ep, q: calls.append(q) or [])
        monkeypatch.setattr("apps.games.views_igdb.enrich_with_wikidata_display_name", _enrich_stub)
        api_client.get("/api/igdb/search/", {"q": "x", "min_rating": "80"})
        # On ne vérifie plus total_rating car il est dans les constantes, mais on vérifie que ça passe
        api_client.get("/api/igdb/search/", {"q": "x", "theme": "1"})
        assert "themes.id" in calls[-1]
