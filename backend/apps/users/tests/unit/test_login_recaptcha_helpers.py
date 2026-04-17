"""Tests unitaires pour helpers reCAPTCHA dans login_views (_client_ip, strip token)."""

from django.test import RequestFactory

from apps.users.login_views import _client_ip, _strip_recaptcha_token_from_parsed_body

factory = RequestFactory()


def test_client_ip_prefers_x_forwarded_for_first_hop():
    req = factory.post("/api/auth/login/")
    req.META["HTTP_X_FORWARDED_FOR"] = "198.51.100.2, 198.51.100.1"
    req.META["REMOTE_ADDR"] = "127.0.0.1"
    assert _client_ip(req) == "198.51.100.2"


def test_client_ip_x_forwarded_for_first_segment_empty_returns_none():
    """Couvre le `or None` quand le premier hop est vide après strip (ligne split/strip)."""
    req = factory.post("/api/auth/login/")
    req.META["HTTP_X_FORWARDED_FOR"] = ", 198.51.100.1"
    req.META["REMOTE_ADDR"] = "10.0.0.1"
    assert _client_ip(req) is None


def test_client_ip_x_forwarded_for_whitespace_only_first_returns_none():
    req = factory.post("/api/auth/login/")
    req.META["HTTP_X_FORWARDED_FOR"] = "   , 198.51.100.1"
    assert _client_ip(req) is None


def test_client_ip_falls_back_to_remote_addr():
    req = factory.post("/api/auth/login/")
    req.META["REMOTE_ADDR"] = "172.18.0.1"
    assert _client_ip(req) == "172.18.0.1"


def test_strip_recaptcha_token_removes_key_from_full_data_dict():
    req = factory.post("/api/auth/login/", {}, content_type="application/json")
    req._full_data = {"email": "a@b.co", "password": "x", "recaptcha_token": "tok"}
    _strip_recaptcha_token_from_parsed_body(req)
    assert req._full_data == {"email": "a@b.co", "password": "x"}


def test_strip_recaptcha_token_no_op_when_no_full_data():
    req = factory.post("/api/auth/login/")
    assert not hasattr(req, "_full_data") or getattr(req, "_full_data", None) is None
    _strip_recaptcha_token_from_parsed_body(req)  # ne lève pas


def test_strip_recaptcha_token_no_op_when_payload_not_dict():
    req = factory.post("/api/auth/login/")
    req._full_data = ["not", "a", "dict"]
    _strip_recaptcha_token_from_parsed_body(req)
    assert req._full_data == ["not", "a", "dict"]
