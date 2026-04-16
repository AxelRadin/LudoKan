from urllib.parse import urlencode

from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class SteamLoginInitiateView(APIView):
    """
    Initie le flux OpenID pour Steam.
    Renvoie l'URL vers laquelle le frontend doit rediriger l'utilisateur.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Initier la connexion Steam",
        description="Génère l'URL d'authentification OpenID de Steam pour lier le compte utilisateur.",
        responses={
            200: inline_serializer(
                name="SteamAuthUrlResponse",
                fields={"auth_url": serializers.CharField()},
            )
        },
    )
    def get(self, request, *args, **kwargs):
        # Base OpenID paramaters for Steam
        steam_openid_url = "https://steamcommunity.com/openid/login"

        # Le callback sera géré côté frontend ou backend selon l'archi.
        # On utilise le return_to de nos settings.
        return_to = settings.STEAM_REDIRECT_URL
        if not return_to:
            return Response(
                {"detail": "La configuration STEAM_REDIRECT_URL est manquante."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Extraction du domaine (realm) à partir de return_to pour Steam
        # Le realm est en général 'https://domaine.com'
        from urllib.parse import urlparse

        parsed = urlparse(return_to)
        realm = f"{parsed.scheme}://{parsed.netloc}"

        params = {
            "openid.ns": "http://specs.openid.net/auth/2.0",  # noqa # nosec # nosonar
            "openid.mode": "checkid_setup",
            "openid.return_to": return_to,
            "openid.realm": realm,
            "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",  # noqa # nosec # nosonar
            "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",  # noqa # nosec # nosonar
        }

        auth_url = f"{steam_openid_url}?{urlencode(params)}"
        return Response({"auth_url": auth_url}, status=status.HTTP_200_OK)
