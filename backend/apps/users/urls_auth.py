from allauth.account.views import ConfirmEmailView
from django.urls import include, path, re_path

from apps.users.views import SuspensionAwareUserDetailsView

urlpatterns = [
    re_path(
        r"^registration/account-confirm-email/(?P<key>[-:\w]+)/$",
        ConfirmEmailView.as_view(),
        name="account_confirm_email",
    ),
    path("password/reset/confirm/<uidb64>/<token>/", lambda request, uidb64, token: None, name="password_reset_confirm"),
    # Override du endpoint /api/auth/user/ pour intégrer le contrôle de suspension
    path("user/", SuspensionAwareUserDetailsView.as_view(), name="rest_user_details"),
    # Auth
    path("", include("dj_rest_auth.urls")),
    path("registration/", include("dj_rest_auth.registration.urls")),
]
