import requests
from django.conf import settings
from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.response import Response


RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'


def verify_recaptcha(token: str) -> bool:
    try:
        response = requests.post(
            RECAPTCHA_VERIFY_URL,
            data={'secret': settings.RECAPTCHA_SECRET_KEY, 'response': token},
            timeout=5,
        )
        return response.json().get('success', False)
    except requests.RequestException:
        return False


class RecaptchaLoginView(LoginView):
    def post(self, request, *args, **kwargs):
        token = request.data.get('recaptcha_token')
        if not token:
            return Response(
                {'detail': 'reCAPTCHA manquant.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not verify_recaptcha(token):
            return Response(
                {'detail': 'Échec de la vérification reCAPTCHA.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().post(request, *args, **kwargs)
