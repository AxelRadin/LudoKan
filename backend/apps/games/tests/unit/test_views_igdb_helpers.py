"""Tests unitaires des helpers de views_igdb (sans requêtes HTTP)."""

from unittest.mock import MagicMock

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.games.igdb_proxy_constants import MAX_TRANSLATE_TEXT_LEN
from apps.games.views_igdb import _clamp_limit, _clamp_limit_200, _clamp_offset, _is_igdb_unavailable
from apps.games.views_igdb_helpers import (
    build_translate_chunks,
    filter_raw_games_by_genre_platform_ids,
    franchises_collections_fetch_terms,
    franchises_search_build_payload,
    igdb_search_non_suggest_results,
    igdb_search_suggest_results,
    merge_igdb_where_predicates,
    merge_trending_where_with_filters,
    parse_genre_id_param,
    parse_igdb_id_list_param,
    parse_optional_int_query,
    remove_q_equals_artifact,
    search_page_fallback_search,
    search_page_name_matches,
    split_sentences_for_translate,
    translate_chunks_mymemory,
    translate_request_body_to_french,
    trending_enrich_for_response,
    trending_fetch_games_array,
    trending_fetch_total_count,
)


def test_split_sentences_splits_on_punctuation():
    """Les segments incluent les espaces après la ponctuation (l. 63)."""
    assert split_sentences_for_translate("Hello. World! Yes?") == [
        "Hello. ",
        "World! ",
        "Yes?",
    ]


def test_split_sentences_no_punctuation_returns_whole():
    assert split_sentences_for_translate("no punct here") == ["no punct here"]


def test_split_sentences_strips_empty_segments():
    """Si tout est vide après strip, retourne [text] original."""
    assert split_sentences_for_translate("   ") == ["   "]


def test_remove_q_equals_artifact_start_of_string():
    assert remove_q_equals_artifact("q=foo") == "foo"


def test_remove_q_equals_artifact_after_space():
    assert remove_q_equals_artifact("hi q=bar") == "hi bar"


def test_remove_q_equals_not_removed_if_space_after_equals():
    """q= suivi d'un espace : pas de suppression (l. 83)."""
    assert remove_q_equals_artifact("q= foo") == "q= foo"


def test_parse_igdb_id_list_param_comma_separated():
    assert parse_igdb_id_list_param("1,2,3") == [1, 2, 3]


def test_parse_igdb_id_list_param_invalid_skipped():
    assert parse_igdb_id_list_param("1,x,3") == [1, 3]


def test_parse_igdb_id_list_param_empty_and_whitespace():
    assert parse_igdb_id_list_param("") == []
    assert parse_igdb_id_list_param("   ") == []


def test_parse_igdb_id_list_param_skips_empty_segments():
    assert parse_igdb_id_list_param("1,,2, ,3") == [1, 2, 3]


def test_parse_genre_id_param_invalid_returns_none():
    assert parse_genre_id_param("nope") is None


def test_parse_genre_id_param_none_returns_none():
    assert parse_genre_id_param(None) is None


def test_parse_optional_int_query_none_empty_and_invalid():
    assert parse_optional_int_query(None) is None
    assert parse_optional_int_query("") is None
    assert parse_optional_int_query("   ") is None
    assert parse_optional_int_query("not-int") is None


def test_parse_optional_int_query_accepts_int_string():
    assert parse_optional_int_query("42") == 42


def test_merge_igdb_where_predicates_genre_only():
    out = merge_igdb_where_predicates("total_rating_count > 0", [10, 11], [])
    assert "genres = (10)" in out and "genres = (11)" in out
    assert "platforms" not in out


def test_merge_igdb_where_predicates_platform_only():
    out = merge_igdb_where_predicates('name ~ *"x"* & total_rating_count > 0', [], [48, 49])
    assert "platforms = (48)" in out and "platforms = (49)" in out
    assert out.startswith("where ")


def test_merge_igdb_where_predicates_base_only_no_extras():
    out = merge_igdb_where_predicates("total_rating_count > 0", [], [])
    assert out == "where total_rating_count > 0"


def test_filter_raw_games_early_return_same_list():
    games = [{"id": 1}]
    assert filter_raw_games_by_genre_platform_ids(games, [], []) is games


def test_filter_raw_games_keeps_int_genre_ids_and_dict_platforms():
    games = [
        {"id": 1, "genres": [5], "platforms": []},
        {"id": 2, "genres": [9], "platforms": [{"id": 48, "name": "PS5"}]},
    ]
    assert [g["id"] for g in filter_raw_games_by_genre_platform_ids(games, [5], [])] == [1]
    assert [g["id"] for g in filter_raw_games_by_genre_platform_ids(games, [], [48])] == [2]


def test_merge_trending_where_returns_unchanged_if_head_not_where():
    bad = "invalid clause; sort total_rating_count desc;"
    assert merge_trending_where_with_filters(bad, [1], [2]) == bad


def test_merge_trending_where_no_extras_only_base_condition():
    base = "where total_rating_count > 0; sort total_rating_count desc;"
    out = merge_trending_where_with_filters(base, [], [])
    assert out.strip().startswith("where total_rating_count > 0")


def test_trending_fetch_games_array_legacy_pure_mixed_split():
    raw = [
        {"id": 1, "genres": [{"id": 5}], "total_rating_count": 10},
        {"id": 2, "genres": [{"id": 5}, {"id": 6}], "total_rating_count": 20},
    ]

    def mock_igdb(_ep, _q):
        return raw

    out = trending_fetch_games_array(mock_igdb, [5], [], "popularity", limit=1, offset=1)
    assert len(out) == 1
    assert out[0]["id"] == 2


def test_trending_fetch_games_array_use_demo_applies_slice(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )

    def mock_igdb(_ep, _q):
        return [{"id": i, "total_rating_count": 1} for i in range(100)]

    out = trending_fetch_games_array(
        mock_igdb,
        [],
        [],
        "popularity",
        limit=5,
        offset=10,
        min_age=12,
        min_players=None,
        max_players=None,
    )
    assert len(out) == 5
    assert out[0]["id"] == 10


def test_trending_fetch_games_array_use_demo_with_genre_uses_list_with_genres(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    queries = []

    def mock_igdb(_ep, q):
        queries.append(q)
        return [{"id": 1}]

    trending_fetch_games_array(
        mock_igdb,
        [4],
        [],
        "popularity",
        limit=1,
        offset=0,
        min_age=12,
        min_players=None,
        max_players=None,
    )
    assert queries and "genres" in queries[0] and "age_ratings" in queries[0]


def test_trending_fetch_games_array_multiple_genres_no_demo(monkeypatch):
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        return []

    trending_fetch_games_array(mock_igdb, [3, 4], [], "popularity", limit=5, offset=0)
    assert len(calls) == 1
    assert "genres = (3)" in calls[0] and "genres = (4)" in calls[0]


def test_trending_fetch_total_count_use_demo_branch(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw[:3],
    )

    def mock_igdb(_ep, _q):
        return [{"id": i} for i in range(50)]

    n = trending_fetch_total_count(
        mock_igdb,
        [],
        [],
        "popularity",
        min_age=12,
        min_players=None,
        max_players=None,
    )
    assert n == 3


def test_trending_fetch_total_count_non_demo_returns_len_raw(monkeypatch):
    def mock_igdb(_ep, _q):
        return [{"id": 1}, {"id": 2}]

    n = trending_fetch_total_count(mock_igdb, [], [], "popularity")
    assert n == 2


def test_search_page_name_matches_post_slice_with_demographics(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    queries = []

    def mock_igdb(_ep, q):
        queries.append(q)
        return [{"id": i, "total_rating_count": 1} for i in range(100)]

    out = search_page_name_matches(
        mock_igdb,
        "x",
        "x",
        limit=5,
        offset=10,
        genre_ids=[1],
        platform_ids=[],
        min_age=7,
        min_players=None,
        max_players=None,
    )
    assert len(out) == 5
    assert out[0]["id"] == 10
    assert ",genres" in queries[0]
    assert "age_ratings" in queries[0]
    assert "offset 0" in queries[0]


def test_search_page_name_matches_second_query_when_accent_differs(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    queries = []

    def mock_igdb(_ep, q):
        queries.append(q)
        if len(queries) == 1:
            return []
        return [{"id": 1, "total_rating_count": 1}]

    out = search_page_name_matches(
        mock_igdb,
        "café",
        "cafe",
        limit=5,
        offset=0,
        genre_ids=None,
        platform_ids=None,
        min_age=None,
        min_players=None,
        max_players=None,
    )
    assert len(queries) == 2
    assert len(out) == 1


def test_search_page_fallback_search_exception_returns_empty():
    def boom(_ep, _q):
        raise RuntimeError("igdb down")

    assert (
        search_page_fallback_search(
            boom,
            "q",
            limit=5,
            genre_ids=[1],
            platform_ids=None,
            min_age=None,
            min_players=None,
            max_players=None,
        )
        == []
    )


def test_search_page_fallback_search_success_filters_sorts_and_limits(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )

    def mock_igdb(_ep, _q):
        return [
            {"id": 1, "total_rating_count": 5, "genres": [{"id": 1}]},
            {"id": 2, "total_rating_count": 20, "genres": [{"id": 1}]},
            {"id": 3, "total_rating_count": 10, "genres": [{"id": 9}]},
        ]

    out = search_page_fallback_search(
        mock_igdb,
        "q",
        limit=1,
        genre_ids=[1],
        platform_ids=None,
        min_age=None,
        min_players=None,
        max_players=None,
    )
    assert len(out) == 1
    assert out[0]["id"] == 2


def test_merge_trending_where_injects_genre_and_platform():
    base = "where total_rating_count > 0; sort total_rating_count desc;"
    out = merge_trending_where_with_filters(base, [4, 5], [48])
    assert "genres = (4)" in out and "genres = (5)" in out
    assert "platforms = (48)" in out
    assert "total_rating_count > 0" in out


def test_igdb_search_non_suggest_with_genre_uses_extended_fields(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    queries = []

    def mock_igdb(_ep, q):
        queries.append(q)
        return [{"id": 1, "total_rating_count": 5, "genres": [{"id": 2}]}]

    out = igdb_search_non_suggest_results(
        mock_igdb,
        "zelda",
        "zelda",
        limit=3,
        genre_ids=[2],
        platform_ids=None,
        min_age=None,
        min_players=None,
        max_players=None,
    )
    assert len(out) == 1
    assert ",genres" in queries[0]


def test_igdb_search_non_suggest_second_query_when_first_empty(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        if len(calls) == 1:
            return []
        return [{"id": 1, "total_rating_count": 1}]

    out = igdb_search_non_suggest_results(mock_igdb, "a", "b", limit=5)
    assert len(calls) == 2
    assert len(out) == 1


def test_igdb_search_non_suggest_with_min_age_adds_demographics_fields(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    queries = []

    def mock_igdb(_ep, q):
        queries.append(q)
        return [{"id": 1, "total_rating_count": 5}]

    igdb_search_non_suggest_results(
        mock_igdb,
        "x",
        "x",
        limit=2,
        min_age=12,
    )
    assert "age_ratings" in queries[0]


def test_igdb_search_suggest_swallows_name_request_exception(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        if len(calls) == 1:
            raise RuntimeError("name down")
        return [{"id": 1, "total_rating_count": 10}]

    out = igdb_search_suggest_results(mock_igdb, "x", "x", limit=5)
    assert len(out) == 1


def test_igdb_search_suggest_swallows_search_request_exception(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        if len(calls) == 1:
            return [{"id": 2, "total_rating_count": 5}]
        raise RuntimeError("search down")

    out = igdb_search_suggest_results(mock_igdb, "x", "x", limit=5)
    assert len(out) == 1 and out[0]["id"] == 2


def test_igdb_search_suggest_accent_fallback_merges_filters(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        if len(calls) <= 2:
            return []
        return [{"id": 1, "total_rating_count": 10, "genres": [{"id": 1}]}]

    out = igdb_search_suggest_results(
        mock_igdb,
        "café",
        "cafe",
        limit=3,
        genre_ids=[1],
    )
    assert len(calls) == 3
    assert len(out) == 1


def test_igdb_search_suggest_fallback_swallows_exception(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.filter_games_raw_by_demographics",
        lambda _req, games_raw, _ma, _mn, _mx: games_raw,
    )
    calls = []

    def mock_igdb(_ep, q):
        calls.append(q)
        if len(calls) <= 2:
            return []
        raise RuntimeError("fallback")

    out = igdb_search_suggest_results(mock_igdb, "café", "cafe", limit=2)
    assert out == []


def test_clamp_limit_defaults_and_bounds():
    assert _clamp_limit(None) == 1
    assert _clamp_limit("5") == 5
    assert _clamp_limit(100, max_val=50) == 50
    assert _clamp_limit(0) == 1


def test_clamp_limit_200():
    assert _clamp_limit_200(None) == 1
    assert _clamp_limit_200(300, max_val=200) == 200


def test_clamp_offset():
    assert _clamp_offset(None) == 0
    assert _clamp_offset("-3") == 0
    assert _clamp_offset(10) == 10


@pytest.mark.parametrize(
    "exc,expected",
    [
        (ImproperlyConfigured("x"), True),
        (RuntimeError("IGDB error 401 on games"), True),
        (RuntimeError("authorization failure"), True),
        (RuntimeError("random"), False),
    ],
)
def test_is_igdb_unavailable(exc, expected):
    assert _is_igdb_unavailable(exc) is expected


def _igdb_request_that_raises(_endpoint, _query):
    raise RuntimeError("IGDB unavailable")


@pytest.mark.parametrize("genre_ids", [[], [42]])
def test_trending_fetch_total_count_returns_zero_on_igdb_error(genre_ids):
    """Branche except si la requête IGDB échoue."""
    assert trending_fetch_total_count(_igdb_request_that_raises, genre_ids, [], "popularity") == 0


def test_trending_enrich_for_response_enrich_true(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.enrich_normalized_games",
        lambda games, user=None: games,
    )

    def enrich_fn(games):
        return [{"id": x["id"], "name": f"E{x['id']}", "total_rating_count": 1} for x in games]

    raw = [{"id": 1, "name": "A", "total_rating_count": 5}]
    out = trending_enrich_for_response(raw, True, enrich_fn, user=None)
    assert out[0]["name"] == "E1"


def test_trending_enrich_for_response_enrich_false_normalizes(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.enrich_normalized_games",
        lambda games, user=None: games,
    )

    raw = [{"id": 9, "name": "RawName", "total_rating_count": 3}]
    out = trending_enrich_for_response(raw, False, lambda x: x, user=None)
    assert out[0]["igdb_id"] == 9
    assert out[0]["name"] == "RawName"


def test_franchises_collections_fetch_terms_happy_path():
    def mock_igdb(ep, q):
        if ep == "franchises":
            return [{"id": 1, "name": "Fr"}]
        if ep == "collections":
            return [{"id": 2, "name": "Col"}]
        return []

    fr, col = franchises_collections_fetch_terms(mock_igdb, ["mario"])
    assert len(fr) == 1 and fr[0]["name"] == "Fr"
    assert len(col) == 1 and col[0]["name"] == "Col"


def test_franchises_collections_fetch_terms_swallows_errors():
    def mock_igdb(_ep, _q):
        raise RuntimeError("down")

    fr, col = franchises_collections_fetch_terms(mock_igdb, ["x"])
    assert fr == [] and col == []


def test_franchises_search_build_payload_deduplicates_ids():
    payload = franchises_search_build_payload(
        [{"id": 1, "name": "A"}, {"id": 1, "name": "dup"}],
        [{"id": 2, "name": "C"}, {"id": 2, "name": "dup2"}],
    )
    assert len(payload) == 2
    types = {p["type"] for p in payload}
    assert types == {"franchise", "collection"}


def test_build_translate_chunks_splits_when_over_max_len():
    long = ("x" * 80 + ". ") * 8
    chunks = build_translate_chunks(long, max_len=50)
    assert len(chunks) >= 2


def test_build_translate_chunks_merges_sentences_under_max_len():
    """Branche `else: current += s` quand le segment tient encore dans max_len."""
    chunks = build_translate_chunks("Hi. Bye! Ok?", max_len=200)
    assert len(chunks) == 1


def test_build_translate_chunks_fallback_when_no_sentences(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.split_sentences_for_translate",
        lambda _t: [],
    )
    assert build_translate_chunks("abcdef", max_len=3) == ["abc"]


def test_translate_chunks_mymemory_success(monkeypatch):
    mock_r = MagicMock()
    mock_r.ok = True
    mock_r.json.return_value = {"responseData": {"translatedText": "  salut  "}}
    monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", lambda *a, **k: mock_r)
    assert translate_chunks_mymemory(["hello"]).strip() == "salut"


def test_translate_chunks_mymemory_not_ok_keeps_chunk(monkeypatch):
    mock_r = MagicMock()
    mock_r.ok = False
    monkeypatch.setattr("apps.games.views_igdb_helpers.requests.get", lambda *a, **k: mock_r)
    assert translate_chunks_mymemory(["abc"]) == "abc"


def test_translate_chunks_mymemory_request_exception(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.requests.get",
        lambda *a, **k: (_ for _ in ()).throw(OSError("net")),
    )
    assert translate_chunks_mymemory(["x"]) == "x"


def test_translate_request_body_to_french_truncates_long_input(monkeypatch):
    monkeypatch.setattr(
        "apps.games.views_igdb_helpers.translate_chunks_mymemory",
        lambda chunks: "ok",
    )
    body = translate_request_body_to_french("z" * (MAX_TRANSLATE_TEXT_LEN + 50))
    assert body == "ok"
