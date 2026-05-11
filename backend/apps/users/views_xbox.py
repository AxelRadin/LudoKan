import logging
from datetime import timedelta
from urllib.parse import urlencode

import requests
from allauth.socialaccount.models import SocialAccount, SocialToken
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import XboxProfile

logger = logging.getLogger(__name__)


class XboxConnectInitiateView(APIView):
    """
    Génère l'URL d'authentification Microsoft pour lier un compte Xbox.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Initier la liaison Xbox",
        description="Construit l'URL OAuth Microsoft avec retour sur le frontend.",
        responses={
            200: inline_serializer(
                name="XboxConnectUrlResponse",
                fields={"auth_url": serializers.URLField()},
            ),
            500: {"description": "Configuration Microsoft manquante."},
        },
    )
    def get(self, request, *args, **kwargs):
        client_id = getattr(settings, "MICROSOFT_CLIENT_ID", "").strip()
        if not client_id:
            return Response(
                {"detail": "MICROSOFT_CLIENT_ID manquant côté serveur."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        frontend_base_url = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
        redirect_uri = f"{frontend_base_url}/auth/microsoft/callback"

        state = signing.dumps(
            {"uid": request.user.id},
            salt="xbox-connect-state",
        )

        params = urlencode(
            {
                "client_id": client_id,
                "response_type": "code",
                "redirect_uri": redirect_uri,
                "response_mode": "query",
                "scope": "openid profile email offline_access User.Read",
                "state": state,
            }
        )
        auth_url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" f"?{params}"
        return Response({"auth_url": auth_url}, status=status.HTTP_200_OK)


class XboxConnectCallbackView(APIView):
    """
    Échange le code OAuth Microsoft, puis lie le compte au user connecté.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Finaliser la liaison Xbox",
        request=inline_serializer(
            name="XboxConnectCallbackRequest",
            fields={
                "code": serializers.CharField(),
                "state": serializers.CharField(),
            },
        ),
        responses={
            200: inline_serializer(
                name="XboxConnectCallbackResponse",
                fields={
                    "detail": serializers.CharField(),
                    "xuid": serializers.CharField(),
                    "gamertag": serializers.CharField(allow_blank=True),
                },
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        code = (request.data.get("code") or "").strip()
        state = (request.data.get("state") or "").strip()

        if not code or not state:
            return Response(
                {"detail": "Paramètres OAuth Microsoft incomplets."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            state_payload = signing.loads(state, salt="xbox-connect-state", max_age=600)
        except signing.BadSignature:
            return Response(
                {"detail": "État OAuth invalide ou expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if int(state_payload.get("uid", 0)) != request.user.id:
            return Response(
                {"detail": "État OAuth invalide pour cet utilisateur."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token_payload = self._exchange_code_for_token(code)
        if isinstance(token_payload, Response):
            return token_payload

        profile_payload = self._fetch_microsoft_profile(token_payload["access_token"])
        if isinstance(profile_payload, Response):
            return profile_payload

        xuid = str(profile_payload.get("id") or "").strip()
        gamertag = str(profile_payload.get("displayName") or "").strip()
        if not xuid:
            return Response(
                {"detail": "L'identifiant Microsoft est manquant dans la réponse fournisseur."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conflict = SocialAccount.objects.filter(provider="microsoft", uid=xuid).exclude(user=request.user).exists()
        if conflict:
            return Response(
                {"detail": "Ce compte Microsoft est déjà lié à un autre utilisateur."},
                status=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            social_account, _ = SocialAccount.objects.get_or_create(
                user=request.user,
                provider="microsoft",
                defaults={"uid": xuid, "extra_data": profile_payload},
            )
            social_account.uid = xuid
            social_account.extra_data = profile_payload
            social_account.save(update_fields=["uid", "extra_data", "last_login"])

            expires_at = None
            expires_in = token_payload.get("expires_in")
            if isinstance(expires_in, int):
                expires_at = timezone.now() + timedelta(seconds=expires_in)

            token = SocialToken.objects.filter(account=social_account).order_by("id").first()
            if token:
                token.token = token_payload["access_token"]
                token.token_secret = token_payload.get("refresh_token", "")
                token.expires_at = expires_at
                token.save(update_fields=["token", "token_secret", "expires_at"])
                SocialToken.objects.filter(account=social_account).exclude(pk=token.pk).delete()
            else:
                SocialToken.objects.create(
                    account=social_account,
                    app=None,
                    token=token_payload["access_token"],
                    token_secret=token_payload.get("refresh_token", ""),
                    expires_at=expires_at,
                )

            XboxProfile.objects.update_or_create(
                user=request.user,
                defaults={
                    "xbox_xuid": xuid,
                    "gamertag": gamertag,
                },
            )

        return Response(
            {
                "detail": "Compte Microsoft lié avec succès.",
                "xuid": xuid,
                "gamertag": gamertag,
            },
            status=status.HTTP_200_OK,
        )

    def _exchange_code_for_token(self, code: str):
        client_id = getattr(settings, "MICROSOFT_CLIENT_ID", "").strip()
        client_secret = getattr(settings, "MICROSOFT_CLIENT_SECRET", "").strip()
        frontend_base_url = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
        redirect_uri = f"{frontend_base_url}/auth/microsoft/callback"
        if not client_id or not client_secret:
            return Response(
                {"detail": "Configuration Microsoft incomplète côté serveur."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            token_res = requests.post(
                "https://login.microsoftonline.com/common/oauth2/v2.0/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "scope": "openid profile email offline_access User.Read",
                },
                timeout=15,
            )
        except requests.RequestException:
            logger.exception("Microsoft token exchange request failed")
            return Response(
                {"detail": "Erreur de communication avec Microsoft."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if token_res.status_code != 200:
            logger.warning(
                "Microsoft token exchange failed with status=%s body=%s",
                token_res.status_code,
                token_res.text,
            )
            return Response(
                {"detail": "Impossible de valider le code Microsoft."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_payload = token_res.json()
        if not token_payload.get("access_token"):
            return Response(
                {"detail": "Token Microsoft invalide ou incomplet."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return token_payload

    def _fetch_microsoft_profile(self, access_token: str):
        try:
            profile_res = requests.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=15,
            )
        except requests.RequestException:
            logger.exception("Microsoft profile request failed")
            return Response(
                {"detail": "Erreur de communication avec Microsoft Graph."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if profile_res.status_code != 200:
            logger.warning(
                "Microsoft profile fetch failed with status=%s body=%s",
                profile_res.status_code,
                profile_res.text,
            )
            return Response(
                {"detail": "Impossible de récupérer le profil Microsoft."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return profile_res.json()


class XboxDisconnectView(APIView):
    """
    Supprime la liaison entre le compte de l'utilisateur et son profil Xbox.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Déconnecter le compte Xbox",
        description="Supprime le XboxProfile associé à l'utilisateur.",
        responses={
            204: None,
            404: {"description": "L'utilisateur n'a pas de compte Xbox lié."},
        },
    )
    def delete(self, request, *args, **kwargs):
        if hasattr(request.user, "xbox_profile"):
            request.user.xbox_profile.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"detail": "Aucun compte Xbox n'est lié."},
            status=status.HTTP_404_NOT_FOUND,
        )
