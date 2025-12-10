from django.urls import path
from . import views
from .views import UserGameViewSet


app_name = 'library'

urlpatterns = [
    path(
        "me/games/",
        UserGameViewSet.as_view({"get": "list"}),
        name="my-games",
    )
]
