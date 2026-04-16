from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import SteamSyncView, UserGameViewSet

app_name = "library"

router = DefaultRouter()
router.register("me/games", UserGameViewSet, basename="my-games")

urlpatterns = [
    path("sync/steam/", SteamSyncView.as_view(), name="sync-steam"),
] + router.urls
