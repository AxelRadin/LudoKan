from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PublicUserCollectionsView, SteamSyncView, UserGameViewSet, UserLibraryViewSet, XboxSyncView

app_name = "library"

router = DefaultRouter()
router.register("me/games", UserGameViewSet, basename="my-games")
router.register("me/collections", UserLibraryViewSet, basename="my-collections")

urlpatterns = [
    path("sync/steam/", SteamSyncView.as_view(), name="sync-steam"),
    path("sync/xbox/", XboxSyncView.as_view(), name="sync-xbox"),
    path("users/<str:pseudo>/collections/", PublicUserCollectionsView.as_view(), name="public-user-collections"),
] + router.urls
