from django.shortcuts import render

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404


from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.library.models import UserGame
from apps.library.serializers import UserGameSerializer


class UserGameViewSet(viewsets.ModelViewSet):

@extend_schema_view(
    list=extend_schema(
        summary="List games in the authenticated user's library",
        description="Return the list of games that belong to the current authenticated user.",
        responses=UserGameSerializer(many=True),
    )
)

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

    #def perform_create(self, serializer):
     #   serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        game_id = kwargs.get("game_id")
        # On récupère la ligne UserGame correspondant à l'utilisateur
        user_game = get_object_or_404(UserGame, user=request.user, game_id=game_id)
        user_game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)