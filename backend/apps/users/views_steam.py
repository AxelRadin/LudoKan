import logging
import re
from urllib.parse import urlencode, urlparse

import requests
from dj_rest_auth.jwt_auth import set_jwt_cookies
from dj_rest_auth.utils import jwt_encode
from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.library.tasks import sync_steam_library_task
from apps.users.models import CustomUser, SteamProfile

logger = logging.getLogger(__name__)


class SteamLoginInitiateView(APIView):
    """
    Initie le flux OpenID pour Steam.
    Permet à tous les utilisateurs (authentifiés ou non) de commencer le processus.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Initier la connexion Steam",
        description="Génère l'URL d'authentification OpenID de Steam pour (se) lier/connecter.",
        responses={
            200: inline_serializer(
                name="SteamAuthUrlResponse",
                fields={"auth_url": serializers.CharField()},
            )
        },
    )
    def get(self, request, *args, **kwargs):
        steam_openid_url = "https://steamcommunity.com/openid/login"

        return_to = settings.STEAM_REDIRECT_URL
        if not return_to:
            return Response(
                {"detail": "La configuration STEAM_REDIRECT_URL est manquante."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
    Vérifie la réponse de Steam et connecte ou inscrit l'utilisateur.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Finaliser la connexion Steam",
        description=(
            "Vérifie la signature OpenID envoyée par Steam. Si l'utilisateur n'existe pas, "
            "un compte est créé. Renvoie les tokens JWT et déclenche la synchronisation."
        ),
        request=inline_serializer(
            name="SteamCallbackRequest",
            fields={"openid_params": serializers.DictField()},
        ),
        responses={
            200: inline_serializer(
                name="SteamCallbackResponse",
                fields={
                    "steam_id": serializers.CharField(),
                    "user_id": serializers.IntegerField(),
                },
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

        # 3. Récupération ou création de l'utilisateur
        steam_profile = SteamProfile.objects.filter(steam_id=steam_id).first()
        is_new_user = False

        if steam_profile:
            user = steam_profile.user
        else:
            is_new_user = True
            # Si l'utilisateur est déjà authentifié, on lie simplement le compte
            if request.user.is_authenticated:
                user = request.user
            else:
                # Création d'un nouvel utilisateur si non connecté
                fake_email = f"steam_{steam_id}@steam.ludokan.internal"
                try:
                    user = CustomUser.objects.get(email=fake_email)
                except CustomUser.DoesNotExist:
                    user = CustomUser.objects.create_user(email=fake_email)

            SteamProfile.objects.create(user=user, steam_id=steam_id)

            if is_new_user:
                try:
                    summary_res = requests.get(
                        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
                        params={"key": settings.STEAM_API_KEY, "steamids": steam_id},
                        timeout=10,
                    )
                    if summary_res.status_code == 200:
                        players = summary_res.json().get("response", {}).get("players", [])
                        if players:
                            player = players[0]
                            user.pseudo = player.get("personaname", user.pseudo)
                            user.avatar_url = player.get("avatarfull", user.avatar_url)

                            # Update email with pseudo format
                            sanitized = re.sub(r"[^a-zA-Z0-9.\-_]", "", user.pseudo).lower()
                            user.email = f"{sanitized or 'steam'}@mailtemporaire.ludokan.internal"
                            user.save(update_fields=["pseudo", "avatar_url", "email"])
                except Exception as e:
                    logger.error(f"Failed to fetch Steam profile summary for user {user.id}: {e}")

        # 4. Génération des tokens JWT
        access_token, refresh_token = jwt_encode(user)

        # 5. Lancer la synchronisation initiale en arrière-plan
        sync_steam_library_task.delay(user.id)

        logger.info(f"SteamAuth: Utilisateur {'créé' if is_new_user else 'connecté'} ({user.pseudo}, SteamID: {steam_id})")

        # 6. Renvoyer la réponse avec les cookies de session JWT

        from dj_rest_auth.app_settings import api_settings

        UserDetailsSerializer = api_settings.USER_DETAILS_SERIALIZER

        serializer = UserDetailsSerializer(user, context={"request": request})
        res_data = {
            "steam_id": steam_id,
            "user": serializer.data,
            "is_new_user": is_new_user,
        }

        # Use token string format for older versions or pass directly for newer ones.
        res = Response(res_data, status=status.HTTP_200_OK)
        # Assuming dj-rest-auth standard behaviour (set_jwt_cookies does not strictly require request for standard case but wait)
        # Django Rest Auth's set_jwt_cookies expects (response, access_token, refresh_token)
        set_jwt_cookies(res, access_token, refresh_token)

        return res


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
