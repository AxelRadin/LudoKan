from types import SimpleNamespace

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.games import igdb_client


def _reset_twitch_token_cache():
    igdb_client._twitch_token_cache["access_token"] = None
    igdb_client._twitch_token_cache["expires_at"] = 0


def test_get_igdb_headers_ok(monkeypatch):
    """Avec IGDB_ACCESS_TOKEN défini, on l'utilise (comportement legacy)."""
    monkeypatch.delenv("TWITCH_CLIENT_ID", raising=False)
    monkeypatch.delenv("TWITCH_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("IGDB_CLIENT_ID", "client-id")
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "token-123")

    headers = igdb_client.get_igdb_headers()

    assert headers["Client-ID"] == "client-id"
    assert headers["Authorization"] == "Bearer token-123"
    assert headers["Content-Type"] == "text/plain"


def test_get_igdb_headers_missing_client_id(monkeypatch):
    monkeypatch.delenv("IGDB_CLIENT_ID", raising=False)
    monkeypatch.delenv("TWITCH_CLIENT_ID", raising=False)
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "token-123")

    with pytest.raises(ImproperlyConfigured):
        igdb_client.get_igdb_headers()


def test_get_igdb_headers_missing_access_token_falls_back_to_twitch(monkeypatch):
    """Sans IGDB_ACCESS_TOKEN, get_igdb_headers appelle get_twitch_access_token qui exige client_secret."""
    monkeypatch.setenv("IGDB_CLIENT_ID", "client-id")
    monkeypatch.delenv("IGDB_ACCESS_TOKEN", raising=False)
    monkeypatch.delenv("TWITCH_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("IGDB_CLIENT_SECRET", raising=False)

    with pytest.raises(ImproperlyConfigured):
        igdb_client.get_igdb_headers()


def test_get_twitch_access_token_success(monkeypatch):
    """Token Twitch récupéré via OAuth et mis en cache."""
    _reset_twitch_token_cache()
    monkeypatch.setenv("TWITCH_CLIENT_ID", "twitch-cid")
    monkeypatch.setenv("TWITCH_CLIENT_SECRET", "twitch-secret")
    monkeypatch.delenv("IGDB_ACCESS_TOKEN", raising=False)

    def fake_post(url, data, headers, timeout):
        assert "oauth2/token" in url
        return SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {"access_token": "oauth-token-xyz", "expires_in": 3600},
        )

    monkeypatch.setattr(igdb_client.requests, "post", fake_post)
    token = igdb_client.get_twitch_access_token()
    assert token == "oauth-token-xyz"
    # Deuxième appel utilise le cache
    token2 = igdb_client.get_twitch_access_token()
    assert token2 == "oauth-token-xyz"


def test_igdb_request_success(monkeypatch):
    called = {}

    def fake_get_igdb_headers():
        called["headers_called"] = True
        return {"Client-ID": "cid", "Authorization": "Bearer token"}

    def fake_post(url, data, headers, timeout):
        called["url"] = url
        called["data"] = data
        called["headers"] = headers
        called["timeout"] = timeout
        return SimpleNamespace(ok=True, json=lambda: [{"id": 1, "name": "Game"}])

    monkeypatch.setattr(igdb_client, "get_igdb_headers", fake_get_igdb_headers)
    monkeypatch.setattr(igdb_client.requests, "post", fake_post)

    result = igdb_client.igdb_request("games", "fields *;")

    assert called["headers_called"] is True
    assert called["url"].endswith("/games")
    assert called["data"] == b"fields *;"
    assert called["timeout"] == 10
    assert result == [{"id": 1, "name": "Game"}]


def test_igdb_request_failure_with_json_body(monkeypatch):
    def fake_get_igdb_headers():
        return {}

    def fake_post(url, data, headers, timeout):
        return SimpleNamespace(
            ok=False,
            status_code=500,
            json=lambda: {"error": "server error"},
            text="should not be used",
        )

    monkeypatch.setattr(igdb_client, "get_igdb_headers", fake_get_igdb_headers)
    monkeypatch.setattr(igdb_client.requests, "post", fake_post)

    with pytest.raises(RuntimeError) as exc:
        igdb_client.igdb_request("games", "fields *;")

    assert "IGDB error 500 on games" in str(exc.value)
    assert "server error" in str(exc.value)


def test_igdb_request_failure_with_non_json_body(monkeypatch):
    def fake_get_igdb_headers():
        return {}

    class FakeResponse:
        ok = False
        status_code = 400
        text = "Bad Request"

        def json(self):
            raise ValueError("not json")

    def fake_post(url, data, headers, timeout):
        return FakeResponse()

    monkeypatch.setattr(igdb_client, "get_igdb_headers", fake_get_igdb_headers)
    monkeypatch.setattr(igdb_client.requests, "post", fake_post)

    with pytest.raises(RuntimeError) as exc:
        igdb_client.igdb_request("covers", "fields *;")

    assert "IGDB error 400 on covers" in str(exc.value)
    assert "Bad Request" in str(exc.value)


# def test_igdb_request_normalizes_endpoint_with_leading_slash(monkeypatch):
#     """Vérifie que l'endpoint avec un slash initial est normalisé (lstrip)."""
#     called = {}

#     def fake_post(url, data, headers, timeout):
#         called["url"] = url
#         return SimpleNamespace(ok=True, json=lambda: [])

#     monkeypatch.setenv("IGDB_CLIENT_ID", "cid")
#     monkeypatch.setenv("IGDB_ACCESS_TOKEN", "token")
#     monkeypatch.setattr(igdb_client.requests, "post", fake_post)

#     igdb_client.igdb_request("/games", "fields *;")

#     assert called["url"].endswith("/games")
