from django.urls import path

from apps.game_tickets.views import (
    AdminGameTicketCommentListCreateView,
    AdminGameTicketHistoryView,
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
    # Admin endpoints FSM transitions
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
        "admin/game-tickets/<int:pk>/history/",
        AdminGameTicketHistoryView.as_view(),
        name="admin-game-ticket-history",
    ),
    path(
        "admin/game-tickets/<int:pk>/comments/",
        AdminGameTicketCommentListCreateView.as_view(),
        name="admin-game-ticket-comments",
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
