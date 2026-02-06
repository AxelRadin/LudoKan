from types import SimpleNamespace

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.games import igdb_client


def test_get_igdb_headers_ok(monkeypatch):
    monkeypatch.setenv("IGDB_CLIENT_ID", "client-id")
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "token-123")

    headers = igdb_client.get_igdb_headers()

    assert headers["Client-ID"] == "client-id"
    assert headers["Authorization"] == "Bearer token-123"
    assert headers["Accept"] == "application/json"


def test_get_igdb_headers_missing_client_id(monkeypatch):
    monkeypatch.delenv("IGDB_CLIENT_ID", raising=False)
    monkeypatch.setenv("IGDB_ACCESS_TOKEN", "token-123")

    with pytest.raises(ImproperlyConfigured):
        igdb_client.get_igdb_headers()


def test_get_igdb_headers_missing_access_token(monkeypatch):
    monkeypatch.setenv("IGDB_CLIENT_ID", "client-id")
    monkeypatch.delenv("IGDB_ACCESS_TOKEN", raising=False)

    with pytest.raises(ImproperlyConfigured):
        igdb_client.get_igdb_headers()


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
    assert called["data"] == "fields *;"
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
