from django.urls import path

from apps.game_tickets.views import GameTicketCreateAPIView

urlpatterns = [
    path(
        "game-tickets/",
        GameTicketCreateAPIView.as_view(),
        name="game-ticket-create",
    ),
]
