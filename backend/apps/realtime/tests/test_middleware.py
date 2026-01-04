import pytest
from django.contrib.auth.models import AnonymousUser
from django.test import override_settings

from apps.realtime.middleware import JwtAuthMiddleware, JwtAuthMiddlewareStack, get_user_from_token


class DummyUser:
    is_anonymous = False


@pytest.mark.anyio
@override_settings(
    CHANNEL_LAYERS={
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
)
async def test_jwt_middleware_no_token_sets_anonymous_user():
    """
    Sans token en query ni en cookie, le middleware doit mettre
    un AnonymousUser dans scope["user"].
    """
    captured_scope = {}

    async def inner(scope, receive, send):
        captured_scope.update(scope)

    middleware = JwtAuthMiddleware(inner)

    scope = {
        "type": "websocket",
        "query_string": b"",
        "headers": [],
    }

    await middleware(scope, None, None)

    assert "user" in captured_scope
    assert isinstance(captured_scope["user"], AnonymousUser)


@pytest.mark.anyio
async def test_jwt_middleware_querystring_token(monkeypatch):
    """
    Si un token est présent dans la querystring, il doit être
    passé à get_user_from_token et scope["user"] doit être
    positionné avec l'utilisateur retourné.
    """
    captured_scope = {}

    async def inner(scope, receive, send):
        captured_scope.update(scope)

    async def fake_get_user_from_token(raw_token: str):
        assert raw_token == "abc123"
        return DummyUser()

    monkeypatch.setattr(
        "apps.realtime.middleware.get_user_from_token",
        fake_get_user_from_token,
    )

    middleware = JwtAuthMiddleware(inner)

    scope = {
        "type": "websocket",
        "query_string": b"token=abc123",
        "headers": [],
    }

    await middleware(scope, None, None)

    assert isinstance(captured_scope.get("user"), DummyUser)


@pytest.mark.anyio
async def test_jwt_middleware_cookie_token(monkeypatch):
    """
    Si aucun token dans la querystring mais un token dans le cookie
    'access_token', il doit être utilisé.
    """
    captured_scope = {}

    async def inner(scope, receive, send):
        captured_scope.update(scope)

    async def fake_get_user_from_token(raw_token: str):
        assert raw_token == "from-cookie"
        return DummyUser()

    monkeypatch.setattr(
        "apps.realtime.middleware.get_user_from_token",
        fake_get_user_from_token,
    )

    middleware = JwtAuthMiddleware(inner)

    scope = {
        "type": "websocket",
        "query_string": b"",
        "headers": [
            (b"cookie", b"foo=bar; access_token=from-cookie"),
        ],
    }

    await middleware(scope, None, None)

    assert isinstance(captured_scope.get("user"), DummyUser)


@pytest.mark.anyio
@pytest.mark.django_db
async def test_get_user_from_token_invalid_returns_anonymous():
    """
    get_user_from_token doit renvoyer un AnonymousUser si le token
    n'est pas valide.
    """
    user = await get_user_from_token("not-a-valid-token")
    assert isinstance(user, AnonymousUser)


@pytest.mark.anyio
@pytest.mark.django_db
async def test_get_user_from_token_valid_returns_user(monkeypatch):
    """
    get_user_from_token doit suivre le chemin de succès (try)
    et renvoyer un utilisateur non anonyme quand JWTAuthentication
    valide correctement le token.
    """

    class DummyJWTAuth:
        def get_validated_token(self, raw_token: str):
            assert raw_token == "valid-token"
            return object()

        def get_user(self, validated):
            return DummyUser()

    monkeypatch.setattr(
        "apps.realtime.middleware.JWTAuthentication",
        DummyJWTAuth,
    )

    user = await get_user_from_token("valid-token")
    assert isinstance(user, DummyUser)


@pytest.mark.anyio
async def test_jwt_auth_middleware_stack_wraps_inner():
    """
    Vérifie que JwtAuthMiddlewareStack wrappe bien la fonction inner.
    """
    called = {}

    async def inner(scope, receive, send):
        called["done"] = True

    middleware = JwtAuthMiddlewareStack(inner)
    scope = {"type": "websocket", "query_string": b"", "headers": []}

    await middleware(scope, None, None)

    assert called.get("done") is True
