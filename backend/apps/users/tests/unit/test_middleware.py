from django.test import RequestFactory
from rest_framework_simplejwt.exceptions import InvalidToken

from apps.users.middleware import IgnoreInvalidJWTMiddleware

factory = RequestFactory()


def make_request(cookies):
    request = factory.get("/")
    # Imitate request.COOKIES as a mutable dict for tests
    request.COOKIES = cookies.copy()
    return request


def test_middleware_clears_empty_tokens_from_cookies():
    middleware = IgnoreInvalidJWTMiddleware(get_response=lambda r: r)

    request = make_request({"access_token": "", "refresh_token": ""})
    response = middleware.process_request(request)

    assert "access_token" not in request.COOKIES
    assert "refresh_token" not in request.COOKIES
    assert response is None


def test_middleware_returns_none_when_no_access_token():
    middleware = IgnoreInvalidJWTMiddleware(get_response=lambda r: r)

    request = make_request({"refresh_token": "something"})
    response = middleware.process_request(request)

    # Rien n'est modifié et la requête passe
    assert "refresh_token" in request.COOKIES
    assert response is None


def test_middleware_clears_invalid_access_token(monkeypatch):
    middleware = IgnoreInvalidJWTMiddleware(get_response=lambda r: r)

    request = make_request({"access_token": "invalid", "refresh_token": "ok"})

    class DummyJWTAuth:
        def get_validated_token(self, token):
            raise InvalidToken("invalid")

    monkeypatch.setattr("apps.users.middleware.JWTAuthentication", DummyJWTAuth)

    response = middleware.process_request(request)

    assert "access_token" not in request.COOKIES
    assert "refresh_token" not in request.COOKIES
    assert response is None
