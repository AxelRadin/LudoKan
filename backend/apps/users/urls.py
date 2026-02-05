from dj_rest_auth.views import UserDetailsView
from django.urls import path

from apps.users.views import AdminActionListView, AdminStatsView, AdminSuspendUserView, AdminUserListView, AdminUserSuspensionListView, MyReportsView

urlpatterns = [
    path("me/", UserDetailsView.as_view(), name="current-user"),
    path("me/reports/", MyReportsView.as_view(), name="my-reports"),
    # Admin
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/suspend/", AdminSuspendUserView.as_view(), name="admin-user-suspend"),
    path("admin/users/<int:pk>/suspensions/", AdminUserSuspensionListView.as_view(), name="admin-user-suspensions"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("admin/actions/", AdminActionListView.as_view(), name="admin-actions-list"),
]
