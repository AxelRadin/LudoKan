from django.urls import path

from apps.game_tickets.views import (
    AdminGameTicketListView,
    AdminGameTicketUpdateView,
    GameTicketApproveAPIView,
    GameTicketAttachmentCreateView,
    GameTicketCreateAPIView,
    GameTicketListAPIView,
    GameTicketPublishAPIView,
    GameTicketRejectAPIView,
    GameTicketStartReviewAPIView,
)

urlpatterns = [
    path(
        "game-tickets/create/",
        GameTicketCreateAPIView.as_view(),
        name="game-ticket-create",
    ),
    path("game-tickets/", GameTicketListAPIView.as_view(), name="game-ticket-list"),
    path(
        "game-tickets/<int:pk>/attachments/",
        GameTicketAttachmentCreateView.as_view(),
        name="game-ticket-attachment-upload",
    ),
    # FSM transitions
    # path(
    #     "game-tickets/<int:pk>/start-review/",
    #     GameTicketStartReviewAPIView.as_view(),
    #     name="game-ticket-start-review",
    # ),
    # path(
    #     "game-tickets/<int:pk>/approve/",
    #     GameTicketApproveAPIView.as_view(),
    #     name="game-ticket-approve",
    # ),
    # path(
    #     "game-tickets/<int:pk>/reject/",
    #     GameTicketRejectAPIView.as_view(),
    #     name="game-ticket-reject",
    # ),
    # path(
    #     "game-tickets/<int:pk>/publish/",
    #     GameTicketPublishAPIView.as_view(),
    #     name="game-ticket-publish",
    # ),
    # Admin endpoints
    path("admin/tickets/", AdminGameTicketListView.as_view(), name="admin-game-ticket-list"),
    path(
        "admin/game-tickets/<int:pk>/",
        AdminGameTicketUpdateView.as_view(),
        name="admin-game-ticket-update",
    ),
    path(
        "game-tickets/<int:pk>/",
        AdminGameTicketUpdateView.as_view(),
        name="admin-game-ticket-patch",
    ),
    path(
        "admin/game-tickets/<int:pk>/approve/",
        GameTicketApproveAPIView.as_view(),
        name="game-ticket-approve",
    ),
    path(
        "admin/game-tickets/<int:pk>/reject/",
        GameTicketRejectAPIView.as_view(),
        name="game-ticket-reject",
    ),
    path(
        "admin/game-tickets/<int:pk>/publish/",
        GameTicketPublishAPIView.as_view(),
        name="game-ticket-publish",
    ),
    path(
        "admin/game-tickets/<int:pk>/start-review/",
        GameTicketStartReviewAPIView.as_view(),
        name="game-ticket-start-review",
    ),
]
