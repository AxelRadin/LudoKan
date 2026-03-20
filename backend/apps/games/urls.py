from django.urls import path

from .views import (
    GameByIgdbIdView,
    GameStatsView,
    GameViewSet,
    GenreViewSet,
    ImportIgdbGameView,
    PlatformViewSet,
    PublisherViewSet,
    RatingCreateView,
    RatingDetailView,
    RatingListView,
)
from .views_igdb import (
    IgdbCollectionGamesView,
    IgdbFranchiseGamesView,
    IgdbFranchisesSearchView,
    IgdbGameDetailView,
    IgdbGamesListView,
    IgdbSearchPageView,
    IgdbSearchView,
    IgdbTranslateView,
    IgdbTrendingView,
    IgdbWikidataTestView,
)

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
    # Proxy IGDB (api/igdb/...)
    path("igdb/games/", IgdbGamesListView.as_view(), name="igdb-games-list"),
    path("igdb/games/<int:id>/", IgdbGameDetailView.as_view(), name="igdb-game-detail"),
    path("igdb/trending/", IgdbTrendingView.as_view(), name="igdb-trending"),
    path("igdb/search/", IgdbSearchView.as_view(), name="igdb-search"),
    path("igdb/collections/<int:id>/games/", IgdbCollectionGamesView.as_view(), name="igdb-collection-games"),
    path("igdb/franchises/<int:id>/games/", IgdbFranchiseGamesView.as_view(), name="igdb-franchise-games"),
    path("igdb/franchises/", IgdbFranchisesSearchView.as_view(), name="igdb-franchises-search"),
    path("igdb/search-page/", IgdbSearchPageView.as_view(), name="igdb-search-page"),
    path("igdb/translate/", IgdbTranslateView.as_view(), name="igdb-translate"),
    path("igdb/wikidata-test/", IgdbWikidataTestView.as_view(), name="igdb-wikidata-test"),
    # Games CRUD & library
    path("games/", game_list, name="game-list"),
    path("games/<int:pk>/", game_detail, name="game-detail"),
    path("games/igdb/<int:igdb_id>/", GameByIgdbIdView.as_view(), name="game-by-igdb"),
    path("games/igdb-import/", ImportIgdbGameView.as_view(), name="game-igdb-import"),
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
