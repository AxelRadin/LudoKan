from dj_rest_auth.views import UserDetailsView
from django.urls import path

urlpatterns = [
    path("me/", UserDetailsView.as_view(), name="current-user"),
]
