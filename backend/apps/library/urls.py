from django.urls import path
from . import views
from .views import UserGameViewSet


app_name = 'library'

#urlpatterns = [
 #   path(
  #      "me/games/",
   #     UserGameViewSet.as_view({"get": "list"}),
    #    name="my-games",
    #)
#]

from rest_framework.routers import DefaultRouter
from .views import UserGameViewSet

router = DefaultRouter()
router.register("me/games", UserGameViewSet, basename="my-games")

urlpatterns = router.urls
