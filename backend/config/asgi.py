"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialiser Django (charge les apps, modèles, etc.)
django_asgi_app = get_asgi_application()

from apps.realtime.middleware import jwt_auth_middleware_stack  # noqa: E402

# Les imports qui dépendent des apps Django doivent venir APRÈS get_asgi_application()
from config.routing import websocket_urlpatterns  # noqa: E402

# Application ASGI globale :
# - "http" continue d'être servi par Django comme avant
# - "websocket" est géré par Channels + JwtAuthMiddleware + URLRouter
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": jwt_auth_middleware_stack(
            URLRouter(websocket_urlpatterns),
        ),
    }
)
