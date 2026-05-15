from django.urls import path

from apps.support.views import AdminSupportTicketDetailView, AdminSupportTicketListView, UserSupportTicketDetailView, UserSupportTicketListCreateView

app_name = "support"

urlpatterns = [
    path("support/tickets/", UserSupportTicketListCreateView.as_view(), name="support-ticket-list-create"),
    path("support/tickets/<int:pk>/", UserSupportTicketDetailView.as_view(), name="support-ticket-detail"),
    path("admin/support/tickets/", AdminSupportTicketListView.as_view(), name="admin-support-ticket-list"),
    path(
        "admin/support/tickets/<int:pk>/",
        AdminSupportTicketDetailView.as_view(),
        name="admin-support-ticket-detail",
    ),
]
