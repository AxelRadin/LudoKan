import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


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
