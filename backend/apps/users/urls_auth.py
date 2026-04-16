from allauth.account.views import ConfirmEmailView
from django.urls import include, path, re_path

from apps.users.views import SuspensionAwareUserDetailsView
<<<<<<< feat/KAN-362-google-oauth-auth
from apps.users.views_social import GoogleLoginView
from apps.users.views_steam import SteamLoginInitiateView
=======
from apps.users.views_steam import SteamDisconnectView, SteamLoginInitiateView
>>>>>>> staging

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
    path("steam/login/", SteamLoginInitiateView.as_view(), name="steam_login_init"),
    path("steam/disconnect/", SteamDisconnectView.as_view(), name="steam_disconnect"),
    path("", include("dj_rest_auth.urls")),
    path("registration/", include("dj_rest_auth.registration.urls")),
    # Google Login
    path("google/", GoogleLoginView.as_view(), name="google_login"),
]
