from dj_rest_auth.views import UserDetailsView
from django.urls import path

from apps.users.views import AdminSuspendUserView

urlpatterns = [
    path("me/", UserDetailsView.as_view(), name="current-user"),
    path("admin/users/<int:pk>/suspend/", AdminSuspendUserView.as_view(), name="admin-user-suspend"),
]
