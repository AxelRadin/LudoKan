from django.urls import path

from .views import (
    GameViewSet,
    PublisherViewSet,
    GenreViewSet,
    PlatformViewSet,
    RatingCreateView,
    RatingDetailView,
    RatingListView,
    GameStatsView,
)

from .views import GameViewSet, GenreViewSet, PlatformViewSet, PublisherViewSet, RatingCreateView, RatingDetailView, RatingListView

app_name = "games"


game_list = GameViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

game_detail = GameViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

publisher_list = PublisherViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

publisher_detail = PublisherViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

genre_list = GenreViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

genre_detail = GenreViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

platform_list = PlatformViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

platform_detail = PlatformViewSet.as_view(
    {
        "get": "retrieve",
        "put": "update",
        "patch": "partial_update",
        "delete": "destroy",
    }
)


urlpatterns = [
    path("games/", game_list, name="game-list"),
    path("games/<int:pk>/", game_detail, name="game-detail"),
    path("publishers/", publisher_list, name="publisher-list"),
    path("publishers/<int:pk>/", publisher_detail, name="publisher-detail"),
    path("genres/", genre_list, name="genre-list"),
    path("genres/<int:pk>/", genre_detail, name="genre-detail"),
    path("platforms/", platform_list, name="platform-list"),
    path("platforms/<int:pk>/", platform_detail, name="platform-detail"),
    path("ratings/", RatingListView.as_view(), name="rating-list"),
    path("games/<int:game_id>/ratings/", RatingCreateView.as_view(), name="game-rating-create"),
    path("ratings/<int:pk>/", RatingDetailView.as_view(), name="rating-detail"),
    path("games/<int:game_id>/stats/", GameStatsView.as_view(), name="game-stats"),

]
