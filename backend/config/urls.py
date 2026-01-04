"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter

router = DefaultRouter()


@require_GET
def health(request):
    return JsonResponse({"status": "ok"}, status=200)


@require_GET
def sentry_debug(request):
    # Erreur volontaire pour tester l'intégration Sentry
    raise ZeroDivisionError("Sentry debug endpoint triggered")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="schema"),
    path("", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    # Auth
    path("api/auth/", include("apps.users.urls_auth")),
    path("api/", include("apps.users.urls")),
    # Library
    path("api/", include("apps.library.urls")),
    # Games
    path("api/", include("apps.games.urls")),
    # Reviews
    path("api/", include("apps.reviews.urls")),
    # Chat
    path("api/", include("apps.chat.urls")),
]

if settings.DEBUG:
    # Endpoint de debug Sentry uniquement en développement
    urlpatterns.append(path("sentry-debug/", sentry_debug, name="sentry-debug"))

    # Serve media files in development
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
