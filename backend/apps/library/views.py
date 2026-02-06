from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.library.models import UserGame
from apps.library.serializers import UserGameSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Lister les jeux de la bibliothèque de l'utilisateur",
        description="Retourne la liste complète des jeux appartenant à l'utilisateur authentifié.",
        responses=UserGameSerializer(many=True),
    ),
    destroy=extend_schema(
        summary="Supprimer un jeu de la bibliothèque de l'utilisateur",
        description=(
            "Supprime un jeu de la collection personnelle de l'utilisateur. "
            + "Le `game_id` doit correspondre à un jeu présent dans sa bibliothèque."
        ),
        responses={
            204: None,
            404: {"description": "Le jeu n'existe pas dans la bibliothèque de l'utilisateur."},
        },
    ),
)
class UserGameViewSet(viewsets.ModelViewSet):
    serializer_class = UserGameSerializer
    permission_classes = [IsAuthenticated]

    lookup_field = "game_id"

    def get_queryset(self):
        user = self.request.user

        return (
            UserGame.objects.filter(user=user)
            .select_related("game", "game__publisher")
            .prefetch_related("game__genres", "game__platforms")
            .order_by("-date_added")
        )

    def destroy(self, request, *args, **kwargs):
        game_id = kwargs.get("game_id")
        user_game = get_object_or_404(UserGame, user=request.user, game_id=game_id)
        user_game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
