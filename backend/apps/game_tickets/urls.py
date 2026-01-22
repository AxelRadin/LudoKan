from django.urls import path

from apps.game_tickets.views import GameTicketCreateAPIView, GameTicketListAPIView

urlpatterns = [
    path(
        "game-tickets/create/",
        GameTicketCreateAPIView.as_view(),
        name="game-ticket-create",
    ),
    path("game-tickets/", GameTicketListAPIView.as_view(), name="game-ticket-list"),
]
