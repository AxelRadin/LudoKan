from django.urls import path

from apps.core.views import AdminReportsActivityView, NotificationDetailView, NotificationListView, NotificationMarkAllReadView

app_name = "core"


urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("admin/reports/activity/", AdminReportsActivityView.as_view(), name="admin-reports-activity"),
]
