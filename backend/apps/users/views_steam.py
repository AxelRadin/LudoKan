import re
from urllib.parse import urlencode, urlparse

import requests
from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import SteamProfile


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


class SteamLoginCallbackView(APIView):
    """
    Finalise l'authentification OpenID de Steam.
    Vérifie la réponse de Steam et lie le SteamID à l'utilisateur.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Finaliser la connexion Steam",
        description="Vérifie la signature OpenID envoyée par Steam et lie le compte SteamID64 à l'utilisateur.",
        request=inline_serializer(
            name="SteamCallbackRequest",
            fields={"openid_params": serializers.DictField()},
        ),
        responses={
            200: inline_serializer(
                name="SteamCallbackResponse",
                fields={"steam_id": serializers.CharField()},
            ),
            400: {"description": "Validation OpenID échouée ou paramètres manquants."},
        },
    )
    def post(self, request, *args, **kwargs):
        params = request.data
        if not params:
            return Response(
                {"detail": "Paramètres OpenID manquants."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Vérification auprès de Steam
        validation_params = params.copy()
        validation_params["openid.mode"] = "check_authentication"

        try:
            v_res = requests.post(
                "https://steamcommunity.com/openid/login",
                data=validation_params,
                timeout=10,
            )
            if "is_valid:true" not in v_res.text:
                return Response(
                    {"detail": "Échec de la validation OpenID auprès de Steam."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except requests.RequestException:
            return Response(
                {"detail": "Erreur de communication avec Steam."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 2. Extraction du SteamID64
        claimed_id = params.get("openid.claimed_id", "")
        match = re.search(r"https?://steamcommunity\.com/openid/id/(\d+)", claimed_id)
        if not match:
            return Response(
                {"detail": "SteamID64 non trouvé dans la réponse."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        steam_id = match.group(1)

        # 3. Liaison avec l'utilisateur
        SteamProfile.objects.update_or_create(
            user=request.user,
            defaults={"steam_id": steam_id},
        )

        return Response({"steam_id": steam_id}, status=status.HTTP_200_OK)


class SteamDisconnectView(APIView):
    """
    Supprime la liaison entre le compte de l'utilisateur et son profil Steam.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Déconnecter le compte Steam",
        description="Supprime le SteamProfile associé à l'utilisateur.",
        responses={
            204: None,
            404: {"description": "L'utilisateur n'a pas de compte Steam lié."},
        },
    )
    def delete(self, request, *args, **kwargs):
        if hasattr(request.user, "steam_profile"):
            request.user.steam_profile.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"detail": "Aucun compte Steam n'est lié."},
            status=status.HTTP_404_NOT_FOUND,
        )
