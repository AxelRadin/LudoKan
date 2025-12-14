from rest_framework.routers import DefaultRouter

from .views import UserGameViewSet

app_name = "library"

router = DefaultRouter()
router.register("me/games", UserGameViewSet, basename="my-games")

urlpatterns = router.urls
