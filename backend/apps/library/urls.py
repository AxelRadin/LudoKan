from django.urls import path
from .views import UserGameListCreateView, UserGameDetailView

app_name = "library"

urlpatterns = [
    path("user/games/", UserGameListCreateView.as_view(), name="user-game-list"),
    path("user/games/<int:pk>/", UserGameDetailView.as_view(), name="user-game-detail"),
]
