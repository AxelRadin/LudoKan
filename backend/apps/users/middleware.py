from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

class IgnoreInvalidJWTMiddleware(MiddlewareMixin):
    """
    Empêche SimpleJWT de lever une exception sur les cookies
    contenant un access/refresh token invalide.
    On les ignore simplement.
    """

    def process_request(self, request):
        try:
            return None
        except (InvalidToken, TokenError):
            # On ignore tout token corrompu
            # Le login pourra fonctionner normalement
            request.COOKIES.pop('access_token', None)
            request.COOKIES.pop('refresh_token', None)
            return None
