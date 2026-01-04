from rest_framework.routers import DefaultRouter

from apps.matchmaking.views import MatchmakingRequestViewSet

router = DefaultRouter()
router.register("matchmaking/requests", MatchmakingRequestViewSet, basename="matchmaking-request")

urlpatterns = router.urls
