from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GamesInCommonView,
    LibraryPrivacyView,
    PublicUserCollectionGamesView,
    PublicUserCollectionsView,
    PublicUserGamesView,
    SteamSyncView,
    UserGameViewSet,
    UserLibraryViewSet,
    XboxSyncView,
)

app_name = "library"

router = DefaultRouter()
router.register("me/games", UserGameViewSet, basename="my-games")
router.register("me/collections", UserLibraryViewSet, basename="my-collections")

urlpatterns = [
    path("me/library-privacy/", LibraryPrivacyView.as_view(), name="library-privacy"),
    path("sync/steam/", SteamSyncView.as_view(), name="sync-steam"),
    path("sync/xbox/", XboxSyncView.as_view(), name="sync-xbox"),
    path("users/<str:pseudo>/collections/", PublicUserCollectionsView.as_view(), name="public-user-collections"),
    path(
        "users/<str:pseudo>/collections/<int:pk>/games/",
        PublicUserCollectionGamesView.as_view(),
        name="public-user-collection-games",
    ),
    path("users/<str:pseudo>/games/", PublicUserGamesView.as_view(), name="public-user-games"),
    path("users/<str:pseudo>/games-in-common/", GamesInCommonView.as_view(), name="games-in-common"),
] + router.urls
