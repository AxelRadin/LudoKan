from django.shortcuts import render
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.library.models import UserGame
from apps.library.serializers import UserGameSerializer


@extend_schema_view(
    list=extend_schema(
        summary="List games in the authenticated user's library",
        description="Return the list of games that belong to the current authenticated user.",
        responses=UserGameSerializer(many=True),
    )
)
class UserGameViewSet(ReadOnlyModelViewSet):
    """Read-only viewset for the current user's game library."""

    serializer_class = UserGameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            UserGame.objects.filter(user=user)
            .select_related("game", "game__publisher")
            .prefetch_related("game__genres", "game__platforms")
            .order_by("-date_added")
        )
