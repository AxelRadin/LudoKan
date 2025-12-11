from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from apps.library.models import UserGame
from apps.library.serializers import UserGameSerializer


class UserGameViewSet(ModelViewSet):
    serializer_class = UserGameSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            UserGame.objects
            .filter(user=user)
            .select_related("game", "game__publisher")
            .prefetch_related("game__genres", "game__platforms")
            .order_by("-date_added")
        )

    #def perform_create(self, serializer):
     #   serializer.save(user=self.request.user)