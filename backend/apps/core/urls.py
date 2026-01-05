from django.urls import path

from apps.core.views import NotificationDetailView, NotificationListView

app_name = "core"


urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notification-list"),
    path("notifications/<int:pk>/", NotificationDetailView.as_view(), name="notification-detail"),
]
