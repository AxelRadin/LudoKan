from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication


@database_sync_to_async
def get_user_from_token(raw_token: str):
    """
    Valide le JWT avec SimpleJWT et renvoie l'utilisateur associé.

    - Si le token est invalide / expiré / absent -> renvoie AnonymousUser.
    - On réutilise exactement la même logique que pour l'API REST,
      via JWTAuthentication de djangorestframework-simplejwt.
    """
    jwt_auth = JWTAuthentication()
    try:
        validated = jwt_auth.get_validated_token(raw_token)
        return jwt_auth.get_user(validated)
    except Exception:
        return AnonymousUser()


class JwtAuthMiddleware:
    """
    Middleware Channels pour authentifier les connexions WebSocket via JWT.

    Stratégie :
    - Cherche un token dans la querystring ?token=<JWT> (pratique pour les tests avec wscat).
    - Si absent, essaye de lire le cookie "access_token" (même nom que pour l'API).
    - Si un token est trouvé, on peuple scope["user"] avec l'utilisateur authentifié.
    - Sinon, scope["user"] est un AnonymousUser.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        token = self._get_token(scope)

        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = await self._get_session_user(scope)

        return await self.inner(scope, receive, send)

    def _get_token(self, scope):
        # 1) Récupérer le token dans la querystring ?token=<JWT>
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)

        if "token" in params and params["token"]:
            return params["token"][0]

        # 2) Sinon, essayer de récupérer le token dans les cookies (header Cookie)
        headers = dict(scope.get("headers") or [])
        cookie_header = headers.get(b"cookie", b"").decode("utf-8")

        cookies = {}
        for part in cookie_header.split(";"):
            if "=" in part:
                key, value = part.strip().split("=", 1)
                cookies[key] = value

        return cookies.get("access_token")

    async def _get_session_user(self, scope):
        headers = dict(scope.get("headers") or [])
        cookie_header = headers.get(b"cookie", b"").decode("utf-8")

        cookies = {}
        for part in cookie_header.split(";"):
            if "=" in part:
                key, value = part.strip().split("=", 1)
                cookies[key] = value

        session_id = cookies.get("sessionid")
        if not session_id:
            return AnonymousUser()

        from django.contrib.auth import get_user_model

        user_model = get_user_model()

        @database_sync_to_async
        def get_user_from_session(s_id):
            try:
                from importlib import import_module

                from django.conf import settings

                engine = import_module(settings.SESSION_ENGINE)
                store = engine.SessionStore(session_key=s_id)
                session_data = store.load() or {}
                uid = session_data.get("_auth_user_id") or store.get("_auth_user_id")
                if uid:
                    return user_model.objects.filter(pk=uid).first() or AnonymousUser()
            except Exception:
                pass
            return AnonymousUser()

        return await get_user_from_session(session_id)


def jwt_auth_middleware_stack(inner):
    """
    Helper pour composer facilement ce middleware dans le routing Channels.

    Exemple d'utilisation :

        application = ProtocolTypeRouter({
            "websocket": jwt_auth_middleware_stack(
                URLRouter(websocket_urlpatterns)
            ),
        })
    """

    return JwtAuthMiddleware(inner)
