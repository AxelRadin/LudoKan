"""Tests unitaires pour la commande management check_igdb."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from apps.games.management.commands.check_igdb import _read_twitch_env


@pytest.fixture
def clear_igdb_env(monkeypatch):
    """Retire les variables IGDB/Twitch pour un test propre."""
    for key in (
        "TWITCH_CLIENT_ID",
        "TWITCH_CLIENT_SECRET",
        "IGDB_ACCESS_TOKEN",
        "IGDB_CLIENT_ID",
    ):
        monkeypatch.delenv(key, raising=False)


def test_check_igdb_no_config(clear_igdb_env, monkeypatch):
    """Aucune variable : message d'erreur et arrêt avant IGDB."""
    out = StringIO()
    call_command("check_igdb", stdout=out)
    body = out.getvalue()
    assert "Diagnostic IGDB" in body
    assert "Aucune config IGDB trouvée" in body
    assert "TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET" in body


def test_check_igdb_authorization_without_bearer_prefix(monkeypatch):
    """Token length affiché 0 si Authorization ne commence pas par 'Bearer '."""
    monkeypatch.setenv("TWITCH_CLIENT_ID", "id")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "sec")

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            return_value={"Authorization": "Basic xxx"},
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            return_value=[],
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "longueur token: 0" in body


def test_check_igdb_twitch_mode_success(monkeypatch):
    monkeypatch.setenv("TWITCH_CLIENT_ID", "my-client-id")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "my-secret")
    monkeypatch.delenv("IGDB_ACCESS_TOKEN", raising=False)

    def fake_headers():
        return {
            "Authorization": "Bearer " + "t" * 30,
            "Client-ID": "my-client-id",
        }

    def fake_igdb_request(endpoint, query):
        assert endpoint == "games"
        return [{"id": 1, "name": "Test Game"}]

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            side_effect=fake_headers,
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            side_effect=fake_igdb_request,
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Option 1 (Twitch OAuth)" in body
    assert "TWITCH_CLIENT_ID: défini" in body
    assert "Token pour IGDB: Bearer" in body
    assert "longueur token: 30" in body
    assert "OK — IGDB a répondu" in body
    assert "id=1" in body
    assert "name=Test Game" in body


def test_check_igdb_manual_token_mode_shows_warning(monkeypatch):
    """Option 2 : avertissement sur le type de token."""
    monkeypatch.delenv("TWITCH_CLIENT_ID", raising=False)
    monkeypatch.delenv("TWITCH_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "manual-token-value")
    monkeypatch.setenv("IGDB_CLIENT_ID", "igdb-cid")

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            return_value={"Authorization": "Bearer tok", "Client-ID": "igdb-cid"},
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            return_value=[],
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Option 2 (token manuel)" in body
    assert "IGDB_ACCESS_TOKEN: défini" in body
    assert "App Access Token" in body
    assert "TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET" in body


def test_check_igdb_get_headers_fails(monkeypatch):
    monkeypatch.setenv("TWITCH_CLIENT_ID", "id")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "sec")

    with patch(
        "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
        side_effect=RuntimeError("config cassée"),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Erreur get_igdb_headers" in body
    assert "config cassée" in body


def test_check_igdb_smoke_test_non_list_response(monkeypatch):
    monkeypatch.setenv("TWITCH_CLIENT_ID", "id")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "sec")

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            return_value={"Authorization": "Bearer x"},
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            return_value={"unexpected": True},
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Réponse inattendue" in body


def test_check_igdb_smoke_test_error_help_401_manual_token(monkeypatch):
    """Message d'aide long en Option 2 si l'erreur mentionne 401."""
    monkeypatch.delenv("TWITCH_CLIENT_ID", raising=False)
    monkeypatch.delenv("TWITCH_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "bad-manual")
    monkeypatch.setenv("IGDB_CLIENT_ID", "cid")

    err = RuntimeError('IGDB error 401 on games: {"message":"invalid"}')

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            return_value={"Authorization": "Bearer bad", "Client-ID": "cid"},
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            side_effect=err,
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Erreur IGDB:" in body
    assert "Option 2" in body or "IGDB_ACCESS_TOKEN" in body
    assert "id.twitch.tv/oauth2/token" in body


def test_check_igdb_smoke_test_error_generic_message(monkeypatch):
    """Autre erreur : message court (pas la branche 401 Option 2)."""
    monkeypatch.setenv("TWITCH_CLIENT_ID", "id")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "sec")

    with (
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.get_igdb_headers",
            return_value={"Authorization": "Bearer ok"},
        ),
        patch(
            "apps.games.management.commands.check_igdb.igdb_client.igdb_request",
            side_effect=RuntimeError("timeout réseau"),
        ),
    ):
        out = StringIO()
        call_command("check_igdb", stdout=out)
        body = out.getvalue()

    assert "Erreur IGDB:" in body
    assert "timeout réseau" in body
    assert "En cas de 401" in body


def test_read_twitch_env_strips_values(monkeypatch):
    """_read_twitch_env : strip sur les trois valeurs."""

    monkeypatch.setenv("TWITCH_CLIENT_ID", "  cid  ")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", " sec ")
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "  tok  ")

    tid, ts, mt = _read_twitch_env()
    assert tid == "cid"
    assert ts == "sec"
    assert mt == "tok"
