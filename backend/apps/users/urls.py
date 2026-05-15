from dj_rest_auth.views import UserDetailsView
from django.urls import path

from apps.users.views import (
    AdminActionListView,
    AdminReactivateUserView,
    AdminReportsUsersView,
    AdminStatsInsightsView,
    AdminStatsView,
    AdminSuspendUserView,
    AdminUserListView,
    AdminUserSuspensionListView,
    MyReportsView,
)
from apps.users.views_profile import UserPublicProfileView

urlpatterns = [
    path("users/<str:pseudo>/profile/", UserPublicProfileView.as_view(), name="user-public-profile"),
    path("me/", UserDetailsView.as_view(), name="current-user"),
    path("me/reports/", MyReportsView.as_view(), name="my-reports"),
    # Admin
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/suspend/", AdminSuspendUserView.as_view(), name="admin-user-suspend"),
    path("admin/users/<int:pk>/reactivate/", AdminReactivateUserView.as_view(), name="admin-user-reactivate"),
    path("admin/users/<int:pk>/suspensions/", AdminUserSuspensionListView.as_view(), name="admin-user-suspensions"),
    path("admin/stats/insights/", AdminStatsInsightsView.as_view(), name="admin-stats-insights"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/actions/", AdminActionListView.as_view(), name="admin-actions-list"),
    path("admin/reports/users/", AdminReportsUsersView.as_view(), name="admin-reports-users"),
]
