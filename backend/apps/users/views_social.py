from decouple import config
from dj_rest_auth.registration.views import SocialLoginView

from .adapters_social import Allauth65GoogleOAuth2Adapter, Allauth65OAuth2Client


class GoogleLoginView(SocialLoginView):
    adapter_class = Allauth65GoogleOAuth2Adapter
    client_class = Allauth65OAuth2Client
    callback_url = config(
        "GOOGLE_CALLBACK_URL",
        default="http://localhost:5173/auth/google/callback",
    )
