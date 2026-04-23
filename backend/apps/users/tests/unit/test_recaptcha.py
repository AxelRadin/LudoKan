"""Tests unitaires pour apps.users.recaptcha (couverture siteverify)."""

from unittest.mock import MagicMock, patch

import pytest
import requests
from django.test import override_settings

from apps.users.recaptcha import RECAPTCHA_VERIFY_URL, verify_recaptcha


@override_settings(RECAPTCHA_SECRET_KEY="")
def test_verify_recaptcha_false_when_secret_empty():
    assert verify_recaptcha("any-token") is False


@override_settings(RECAPTCHA_SECRET_KEY="   ")
def test_verify_recaptcha_false_when_secret_only_whitespace():
    assert verify_recaptcha("any-token") is False


@override_settings(RECAPTCHA_SECRET_KEY="secret")
@pytest.mark.parametrize("token", ["", None, "   ", "\n\t  "])
def test_verify_recaptcha_false_when_token_missing_or_blank(token):
    assert verify_recaptcha(token) is False  # type: ignore[arg-type]


@override_settings(RECAPTCHA_SECRET_KEY="secret")
def test_verify_recaptcha_success_true():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"success": True}

    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp) as post:
        assert verify_recaptcha("  token-value  ") is True

    post.assert_called_once()
    call_kw = post.call_args
    assert call_kw[0][0] == RECAPTCHA_VERIFY_URL
    data = call_kw[1]["data"]
    assert data["secret"] == "secret"
    assert data["response"] == "token-value"
    assert "remoteip" not in data


@override_settings(RECAPTCHA_SECRET_KEY="secret", RECAPTCHA_SEND_REMOTEIP=True)
def test_verify_recaptcha_sends_remoteip_when_enabled():
    mock_resp = MagicMock(status_code=200, json=lambda: {"success": True})
    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp) as post:
        assert verify_recaptcha("tok", remote_ip="203.0.113.5") is True
    data = post.call_args[1]["data"]
    assert data["remoteip"] == "203.0.113.5"


@override_settings(RECAPTCHA_SECRET_KEY="secret", RECAPTCHA_SEND_REMOTEIP=False)
def test_verify_recaptcha_skips_remoteip_when_disabled_even_if_passed():
    mock_resp = MagicMock(status_code=200, json=lambda: {"success": True})
    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp) as post:
        assert verify_recaptcha("tok", remote_ip="203.0.113.5") is True
    assert "remoteip" not in post.call_args[1]["data"]


@override_settings(RECAPTCHA_SECRET_KEY="secret")
def test_verify_recaptcha_false_when_google_returns_success_false():
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.return_value = {"success": False, "error-codes": ["invalid-input-response"]}
    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp):
        assert verify_recaptcha("bad-token") is False


@override_settings(RECAPTCHA_SECRET_KEY="secret")
def test_verify_recaptcha_false_when_response_body_not_json():
    mock_resp = MagicMock(status_code=200)
    mock_resp.json.side_effect = ValueError("not json")
    mock_resp.text = "<html>error</html>"
    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp):
        assert verify_recaptcha("tok") is False


@override_settings(RECAPTCHA_SECRET_KEY="secret")
def test_verify_recaptcha_false_on_request_exception():
    with patch("apps.users.recaptcha.requests.post", side_effect=requests.RequestException("timeout")):
        assert verify_recaptcha("tok") is False


@override_settings(RECAPTCHA_SECRET_KEY="secret")
def test_verify_recaptcha_logs_long_token_branch(monkeypatch):
    """Jeton > 2000 caractères : branche warning (toujours succès si Google OK)."""
    long_tok = "x" * 2001
    mock_resp = MagicMock(status_code=200, json=lambda: {"success": True})
    with patch("apps.users.recaptcha.requests.post", return_value=mock_resp):
        assert verify_recaptcha(long_tok) is True
