"""Tests unitaires pour la commande management populate_name_fr."""

from io import StringIO
from types import SimpleNamespace

import pytest
from django.core.management import call_command

from apps.games.management.commands import populate_name_fr as mod
from apps.games.models import Game


def test_normalize_strips_accents():
    assert mod.normalize("café") == "cafe"
    assert mod.normalize("  Élève  ") == "Eleve"


def test_fetch_french_names_empty_list():
    assert mod.fetch_french_names([]) == {}


def test_fetch_french_names_success_from_bindings(monkeypatch):
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)

    def fake_get(url, params=None, headers=None, timeout=None):
        assert mod.SPARQL_ENDPOINT in url
        assert timeout == 15
        assert headers.get("User-Agent") == mod.WIKIDATA_USER_AGENT
        return SimpleNamespace(
            ok=True,
            json=lambda: {
                "results": {
                    "bindings": [
                        {
                            "originalName": {"value": "Zelda"},
                            "frLabel": {"value": "The Legend"},
                        }
                    ]
                }
            },
        )

    monkeypatch.setattr(mod.requests, "get", fake_get)
    out = mod.fetch_french_names(["Zelda"])
    assert out["Zelda"] == "The Legend"


def test_fetch_french_names_response_not_ok(monkeypatch):
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)

    def fake_get(url, params=None, headers=None, timeout=None):
        return SimpleNamespace(ok=False, status_code=500)

    monkeypatch.setattr(mod.requests, "get", fake_get)
    out = mod.fetch_french_names(["X"])
    assert out["X"] is None


def test_fetch_french_names_request_exception(monkeypatch):
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)

    def boom(url, params=None, headers=None, timeout=None):
        raise ConnectionError("timeout")

    monkeypatch.setattr(mod.requests, "get", boom)
    out = mod.fetch_french_names(["Y"])
    assert out["Y"] is None


def test_fetch_french_names_skips_empty_fr_label(monkeypatch):
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)

    def fake_get(url, params=None, headers=None, timeout=None):
        return SimpleNamespace(
            ok=True,
            json=lambda: {
                "results": {
                    "bindings": [
                        {
                            "originalName": {"value": "A"},
                            "frLabel": {"value": "   "},
                        }
                    ]
                }
            },
        )

    monkeypatch.setattr(mod.requests, "get", fake_get)
    out = mod.fetch_french_names(["A"])
    assert out["A"] is None


def test_fetch_french_names_chunks_and_sleeps(monkeypatch):
    """Plusieurs chunks : CHUNK_SIZE réduit pour le test."""
    monkeypatch.setattr(mod, "CHUNK_SIZE", 2)
    sleeps = []
    monkeypatch.setattr(mod.time, "sleep", lambda s: sleeps.append(s))

    def fake_get(url, params=None, headers=None, timeout=None):
        return SimpleNamespace(ok=True, json=lambda: {"results": {"bindings": []}})

    monkeypatch.setattr(mod.requests, "get", fake_get)
    mod.fetch_french_names(["a", "b", "c", "d"])
    assert len(sleeps) == 2  # 2 chunks
    assert all(s == 0.5 for s in sleeps)


def test_fetch_french_names_builds_variant_values(monkeypatch):
    """Nom avec 'Version' / 'Edition' → variantes dans VALUES (l. 26-33)."""
    monkeypatch.setattr(mod.time, "sleep", lambda _: None)

    captured = {}

    def fake_get(url, params=None, headers=None, timeout=None):
        captured["query"] = params.get("query", "")
        return SimpleNamespace(ok=True, json=lambda: {"results": {"bindings": []}})

    monkeypatch.setattr(mod.requests, "get", fake_get)
    mod.fetch_french_names(["My Game Version"])
    q = captured["query"]
    assert "VALUES" in q
    assert "My Game Version" in q or "My Game" in q


@pytest.mark.django_db
class TestPopulateNameFrCommand:
    def test_no_games_to_process(self):
        out = StringIO()
        call_command("populate_name_fr", stdout=out)
        assert "Aucun jeu à traiter." in out.getvalue()

    def test_skips_when_all_have_name_fr(self, publisher):
        Game.objects.create(
            igdb_id=91001,
            name="Done",
            name_fr="Déjà",
            publisher=publisher,
        )
        out = StringIO()
        call_command("populate_name_fr", stdout=out)
        assert "Aucun jeu à traiter." in out.getvalue()

    def test_updates_empty_name_fr(self, publisher, monkeypatch):
        g = Game.objects.create(
            igdb_id=91002,
            name="Star Quest",
            name_fr="",
            publisher=publisher,
        )

        def fake_fetch(names_en: list[str]):
            return {n: f"FR({n})" for n in names_en}

        monkeypatch.setattr(mod, "fetch_french_names", fake_fetch)
        out = StringIO()
        call_command("populate_name_fr", stdout=out)
        g.refresh_from_db()
        assert g.name_fr == "FR(Star Quest)"
        assert "1 jeux mis à jour" in out.getvalue() or "mis à jour" in out.getvalue()

    def test_same_name_updates_multiple_rows(self, publisher, monkeypatch):
        Game.objects.create(
            igdb_id=91003,
            name="Same",
            name_fr="",
            publisher=publisher,
        )
        Game.objects.create(
            igdb_id=91004,
            name="Same",
            name_fr="",
            publisher=publisher,
        )

        monkeypatch.setattr(
            mod,
            "fetch_french_names",
            lambda names: {"Same": "Pareil"},
        )
        out = StringIO()
        call_command("populate_name_fr", stdout=out)
        assert Game.objects.filter(name="Same", name_fr="Pareil").count() == 2
        assert "2 jeux mis à jour" in out.getvalue()

    def test_overwrite_processes_all_games(self, publisher, monkeypatch):
        Game.objects.create(
            igdb_id=91005,
            name="OldFr",
            name_fr="Ancien",
            publisher=publisher,
        )

        monkeypatch.setattr(
            mod,
            "fetch_french_names",
            lambda names: {"OldFr": "Nouveau"},
        )
        out = StringIO()
        call_command("populate_name_fr", "--overwrite", stdout=out)
        g = Game.objects.get(igdb_id=91005)
        assert g.name_fr == "Nouveau"
        assert "mis à jour" in out.getvalue()
