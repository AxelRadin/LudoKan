from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication


class IgnoreInvalidJWTMiddleware(MiddlewareMixin):
    """
    Empêche SimpleJWT de lever une exception sur les cookies
    contenant un access/refresh token invalide ou vide.
    On les supprime de la requête pour permettre aux routes
    publiques de fonctionner normalement.
    """

    def _clear_jwt_cookies(self, request):
        for name in ("access_token", "refresh_token"):
            if name in request.COOKIES:
                del request.COOKIES[name]

    def process_request(self, request):
        access_token = request.COOKIES.get("access_token")
        refresh_token = request.COOKIES.get("refresh_token")

        # 1. Si les cookies sont vides / "null" / "undefined" → on les ignore
        empty_values = ("", "null", "undefined", None)
        if access_token in empty_values and refresh_token in empty_values:
            self._clear_jwt_cookies(request)
            return None

        # 2. Si pas d'access_token → on ne tente rien
        if not access_token:
            return None

        # 3. Si access_token présent mais invalide → on nettoie
        try:
            JWTAuthentication().get_validated_token(access_token)
        except (InvalidToken, TokenError):
            self._clear_jwt_cookies(request)

        return None
