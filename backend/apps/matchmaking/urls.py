from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.matchmaking.views import MatchmakingMatchesView, MatchmakingRequestViewSet

router = DefaultRouter()
router.register("matchmaking/requests", MatchmakingRequestViewSet, basename="matchmaking-request")

urlpatterns = router.urls + [
    path(
        "matchmaking/matches/",
        MatchmakingMatchesView.as_view(),
        name="matchmaking-matches",
    ),
]
