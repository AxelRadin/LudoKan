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
        # 1) Récupérer le token dans la querystring ?token=<JWT>
        query_string = scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)

        token = None

        if "token" in params and params["token"]:
            token = params["token"][0]

        # 2) Sinon, essayer de récupérer le token dans les cookies (header Cookie)
        if token is None:
            headers = dict(scope.get("headers") or [])
            cookie_header = headers.get(b"cookie", b"").decode("utf-8")
            cookies = {}
            for part in cookie_header.split(";"):
                if "=" in part:
                    key, value = part.strip().split("=", 1)
                    cookies[key] = value

            token = cookies.get("access_token")

        # 3) Résolution de l'utilisateur à partir du token (ou AnonymousUser)
        if token:
            scope["user"] = await get_user_from_token(token)
        else:
            scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """
    Helper pour composer facilement ce middleware dans le routing Channels.

    Exemple d'utilisation :

        application = ProtocolTypeRouter({
            "websocket": JwtAuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            ),
        })
    """

    return JwtAuthMiddleware(inner)
