import logging

from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.response import Response

from apps.users import recaptcha as recaptcha_module
from apps.users.errors import UserErrors

logger = logging.getLogger(__name__)


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def _strip_recaptcha_token_from_parsed_body(request) -> None:
    """
    Retire recaptcha_token du corps déjà parsé pour que dj-rest-auth ne reçoive
    pas un champ inconnu (utile si un LoginSerializer custom devient strict).
    """
    payload = getattr(request, "_full_data", None)
    if isinstance(payload, dict):
        payload.pop("recaptcha_token", None)


class RecaptchaLoginView(LoginView):
    """Login dj-rest-auth avec vérification Google reCAPTCHA avant authenticate()."""

    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        has_email = bool(email)
        client_ip = _client_ip(request)
        logger.info(
            "POST /api/auth/login/ — étape reCAPTCHA (email_présent=%s, client_ip=%s)",
            has_email,
            client_ip or "(inconnu)",
        )

        token = request.data.get("recaptcha_token")
        if not token:
            logger.warning("POST /api/auth/login/ — reCAPTCHA : jeton manquant dans le corps.")
            return Response(
                {"detail": UserErrors.RECAPTCHA_TOKEN_MISSING},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not recaptcha_module.verify_recaptcha(token, remote_ip=client_ip):
            logger.warning(
                "POST /api/auth/login/ — reCAPTCHA : vérification Google échouée → 400 %s",
                UserErrors.RECAPTCHA_INVALID,
            )
            return Response(
                {"detail": UserErrors.RECAPTCHA_INVALID},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("POST /api/auth/login/ — reCAPTCHA OK, poursuite authentification dj-rest-auth.")
        _strip_recaptcha_token_from_parsed_body(request)
        return super().post(request, *args, **kwargs)
