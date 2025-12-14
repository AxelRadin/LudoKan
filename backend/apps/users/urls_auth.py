from allauth.account.views import ConfirmEmailView
from django.urls import include, path, re_path

urlpatterns = [
    re_path(
        r"^registration/account-confirm-email/(?P<key>[-:\w]+)/$",
        ConfirmEmailView.as_view(),
        name="account_confirm_email",
    ),
    path("password/reset/confirm/<uidb64>/<token>/", lambda request, uidb64, token: None, name="password_reset_confirm"),
    # Auth
    path("", include("dj_rest_auth.urls")),
    path("registration/", include("dj_rest_auth.registration.urls")),
]
