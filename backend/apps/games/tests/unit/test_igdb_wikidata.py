"""Tests unitaires pour apps.games.igdb_wikidata (API Wikidata mockée)."""

from types import SimpleNamespace

import pytest

from apps.games import igdb_wikidata as wd


@pytest.fixture(autouse=True)
def clear_wikidata_cache():
    """Chaque test repart d'un cache vide."""
    wd._wikidata_cache.clear()
    yield
    wd._wikidata_cache.clear()


def test_cache_get_miss_returns_none():
    assert wd._cache_get("unknown") is None


def test_cache_set_get_and_expiry(monkeypatch):
    wd._cache_set("game", "Jeu")
    assert wd._cache_get("game") == "Jeu"

    # Expiration : le slot est supprimé
    wd._wikidata_cache["game"] = ("Jeu", 0.0)
    monkeypatch.setattr(wd.time, "time", lambda: 999_999_999.0)
    assert wd._cache_get("game") is None
    assert "game" not in wd._wikidata_cache


def test_escape_sparql_string():
    assert wd._escape_sparql_string('a"b\\') == 'a\\"b\\\\'


def test_unique_trimmed_names():
    assert wd._unique_trimmed_names(["  A ", "", "B", "  A "]) == ["A", "B"]


def test_partition_cache_hits_prefetches_only_misses():
    wd._cache_set("cached", "En cache")
    result, to_fetch = wd._partition_cache_hits(["cached", "new_one"])
    assert result == {"cached": "En cache"}
    assert to_fetch == ["new_one"]


def test_partition_cache_hit_falsy_cached_value():
    """cached non None mais valeur vide → result[n] = None (ligne 53)."""
    future = wd.time.time() + 3600
    wd._wikidata_cache["x"] = ("", future)
    result, to_fetch = wd._partition_cache_hits(["x"])
    assert result == {"x": None}
    assert to_fetch == []


def test_fetch_batch_parallel_empty_batch():
    r: dict[str, str | None] = {}
    wd._fetch_batch_parallel([], r)
    assert r == {}


def test_fetch_batch_parallel_and_exception_in_worker(monkeypatch):
    calls = []

    def fake_fetch(name: str):
        calls.append(name)
        if name == "boom":
            raise RuntimeError("network")
        return f"FR-{name}"

    monkeypatch.setattr(wd, "fetch_french_label_for_one", fake_fetch)
    result: dict[str, str | None] = {}
    wd._fetch_batch_parallel(["ok", "boom"], result)
    assert set(calls) == {"ok", "boom"}
    assert result["ok"] == "FR-ok"
    assert result["boom"] is None


def test_fetch_french_label_empty_name():
    assert wd.fetch_french_label_for_one("") is None
    assert wd.fetch_french_label_for_one("   ") is None


def test_fetch_french_label_success(monkeypatch):
    def fake_get(url, headers, timeout):
        assert wd.WIKIDATA_SPARQL_URL in url
        assert headers.get("User-Agent") == wd.USER_AGENT
        assert timeout == wd.WIKIDATA_TIMEOUT_SECONDS
        return SimpleNamespace(
            ok=True,
            json=lambda: {
                "results": {
                    "bindings": [
                        {"frLabel": {"value": "  Zelda  "}},
                    ]
                }
            },
        )

    monkeypatch.setattr(wd.requests, "get", fake_get)
    assert wd.fetch_french_label_for_one("The Legend of Zelda") == "Zelda"


def test_fetch_french_label_response_not_ok(monkeypatch):
    monkeypatch.setattr(
        wd.requests,
        "get",
        lambda url, headers, timeout: SimpleNamespace(ok=False, status_code=503),
    )
    assert wd.fetch_french_label_for_one("X") is None


def test_fetch_french_label_empty_bindings(monkeypatch):
    monkeypatch.setattr(
        wd.requests,
        "get",
        lambda url, headers, timeout: SimpleNamespace(
            ok=True,
            json=lambda: {"results": {"bindings": []}},
        ),
    )
    assert wd.fetch_french_label_for_one("Unknown Game") is None


def test_fetch_french_label_request_exception(monkeypatch):
    def raise_timeout(url, headers, timeout):
        raise ConnectionError("timeout")

    monkeypatch.setattr(wd.requests, "get", raise_timeout)
    assert wd.fetch_french_label_for_one("Y") is None


def test_fetch_french_label_invalid_fr_value(monkeypatch):
    monkeypatch.setattr(
        wd.requests,
        "get",
        lambda url, headers, timeout: SimpleNamespace(
            ok=True,
            json=lambda: {
                "results": {
                    "bindings": [
                        {"frLabel": {"value": 123}},  # pas une str
                    ]
                }
            },
        ),
    )
    assert wd.fetch_french_label_for_one("Z") is None


def test_fetch_french_label_whitespace_only_fr(monkeypatch):
    monkeypatch.setattr(
        wd.requests,
        "get",
        lambda url, headers, timeout: SimpleNamespace(
            ok=True,
            json=lambda: {
                "results": {
                    "bindings": [
                        {"frLabel": {"value": "   "}},
                    ]
                }
            },
        ),
    )
    assert wd.fetch_french_label_for_one("W") is None


def test_fetch_french_label_json_missing_results(monkeypatch):
    monkeypatch.setattr(
        wd.requests,
        "get",
        lambda url, headers, timeout: SimpleNamespace(ok=True, json=lambda: None),
    )
    assert wd.fetch_french_label_for_one("Q") is None


def test_fetch_french_label_json_raises(monkeypatch):
    def fake_get(url, headers, timeout):
        def bad_json():
            raise ValueError("invalid json")

        return SimpleNamespace(ok=True, json=bad_json)

    monkeypatch.setattr(wd.requests, "get", fake_get)
    assert wd.fetch_french_label_for_one("Err") is None


def test_wikidata_french_labels_batches_and_uses_cache(monkeypatch):
    """Plusieurs noms + dédoublonnage ; 2ᵉ appel utilise le cache."""
    fetched = []

    def fake_fetch(name: str):
        fetched.append(name)
        return f"fr-{name}"

    monkeypatch.setattr(wd, "fetch_french_label_for_one", fake_fetch)

    names = ["a", "b", "a"]  # doublon retiré par _unique_trimmed_names
    out = wd.wikidata_french_labels_by_english_titles(names)
    assert out["a"] == "fr-a"
    assert out["b"] == "fr-b"
    assert set(fetched) == {"a", "b"} and len(fetched) == 2

    fetched.clear()
    out2 = wd.wikidata_french_labels_by_english_titles(["a", "b"])
    assert fetched == []  # tout en cache
    assert out2["a"] == "fr-a"


def test_wikidata_french_labels_large_list_uses_multiple_batches(monkeypatch):
    """Plus de WIKIDATA_BATCH_CONCURRENCY noms → plusieurs lots."""
    n = wd.WIKIDATA_BATCH_CONCURRENCY + 3
    names = [f"g{i}" for i in range(n)]
    seen = set()

    def fake_fetch(name: str):
        seen.add(name)
        return name

    monkeypatch.setattr(wd, "fetch_french_label_for_one", fake_fetch)
    out = wd.wikidata_french_labels_by_english_titles(names)
    assert len(out) == n
    assert seen == set(names)


def test_enrich_with_wikidata_display_name_empty():
    assert wd.enrich_with_wikidata_display_name([]) == []


def test_enrich_with_wikidata_display_name_maps_fr(monkeypatch):
    monkeypatch.setattr(
        wd,
        "wikidata_french_labels_by_english_titles",
        lambda names: {"Halo": "HaloFR"},
    )
    games = [{"id": 1, "name": "Halo", "x": 1}]
    out = wd.enrich_with_wikidata_display_name(games)
    assert len(out) == 1
    assert out[0]["igdb_id"] == 1
    assert out[0]["name"] == "HaloFR"


def test_enrich_with_wikidata_display_name_fallback_on_exception(monkeypatch):
    def boom(names):
        raise RuntimeError("wikidata down")

    monkeypatch.setattr(wd, "wikidata_french_labels_by_english_titles", boom)
    games = [{"id": 2, "name": "Solo"}]
    out = wd.enrich_with_wikidata_display_name(games)
    assert out[0]["igdb_id"] == 2
    assert out[0]["name"] == "Solo"


def test_enrich_name_not_in_fr_map(monkeypatch):
    monkeypatch.setattr(wd, "wikidata_french_labels_by_english_titles", lambda n: {})
    games = [{"id": 3, "name": "OnlyEn"}]
    out = wd.enrich_with_wikidata_display_name(games)
    assert out[0]["igdb_id"] == 3
    assert out[0]["name"] == "OnlyEn"


def test_wikidata_french_label_by_english_title_debug(monkeypatch):
    monkeypatch.setattr(wd, "fetch_french_label_for_one", lambda n: "DBG")
    assert wd.wikidata_french_label_by_english_title_debug("test") == "DBG"
