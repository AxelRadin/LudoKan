from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.matchmaking.views import GamePartyViewSet, MatchmakingMatchesView, MatchmakingRequestViewSet

router = DefaultRouter()
router.register("matchmaking/requests", MatchmakingRequestViewSet, basename="matchmaking-request")
router.register("matchmaking/parties", GamePartyViewSet, basename="game-party")

urlpatterns = router.urls + [
    path(
        "matchmaking/matches/",
        MatchmakingMatchesView.as_view(),
        name="matchmaking-matches",
    ),
]
