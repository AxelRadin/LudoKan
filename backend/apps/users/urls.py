from django.urls import path
from dj_rest_auth.views import UserDetailsView


urlpatterns = [
    path('me/', UserDetailsView.as_view(), name='current-user'),
]
