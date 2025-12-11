from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from apps.games.models import Game, Publisher, Genre, Platform
from apps.games.serializers import (
    GameReadSerializer,
    GameWriteSerializer,
    PublisherCRUDSerializer,
    GenreCRUDSerializer,
    PlatformCRUDSerializer,
)


class GameViewSet(ModelViewSet):
    queryset = (
        Game.objects.select_related("publisher")
        .prefetch_related("genres", "platforms")
        .order_by("-popularity_score")
    )
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return GameReadSerializer
        return GameWriteSerializer


class PublisherViewSet(ModelViewSet):
    queryset = Publisher.objects.order_by("name")
    serializer_class = PublisherCRUDSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class GenreViewSet(ModelViewSet):
    queryset = Genre.objects.order_by("nom_genre")
    serializer_class = GenreCRUDSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class PlatformViewSet(ModelViewSet):
    queryset = Platform.objects.order_by("nom_plateforme")
    serializer_class = PlatformCRUDSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
