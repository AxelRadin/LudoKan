from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


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

        empty_values = ("", "null", "undefined", None)
        if access_token in empty_values and refresh_token in empty_values:
            self._clear_jwt_cookies(request)
            return None

        if not access_token:
            return None

        try:
            JWTAuthentication().get_validated_token(access_token)
        except (InvalidToken, TokenError):
            self._clear_jwt_cookies(request)

        return None
