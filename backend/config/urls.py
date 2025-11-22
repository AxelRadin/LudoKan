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
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from api.views import ItemViewSet
from rest_framework_simplejwt.views import (TokenObtainPairView,TokenRefreshView)
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.permissions import AllowAny
from apps.users.views import RegisterView, LoginView, LogoutView

router = DefaultRouter()
router.register(r"items", ItemViewSet, basename="item")

def health(request):
    return JsonResponse({"status": "ok"}, status=200)


def sentry_debug(request):
    # Erreur volontaire pour tester l'intégration Sentry
    1 / 0



urlpatterns = [
    path('admin/', admin.site.urls),
    # path('api/', include('api.urls')),  
    path("api/", include(router.urls)),
    path("health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(permission_classes=[AllowAny]), name="schema"),
    path("", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path('api/register/', RegisterView.as_view(), name='register'),
    #path("api/auth/", include("apps.users.urls")),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/register/', RegisterView.as_view(), name='custom_register'),
    path('api/auth/login/', LoginView.as_view(), name='custom_login'),
    path('api/auth/logout/', LogoutView.as_view(), name='custom_logout'),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("sentry-debug/", sentry_debug, name="sentry-debug"),


]
