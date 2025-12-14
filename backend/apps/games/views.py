from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.games.models import Game, Genre, Platform, Publisher, Rating
from apps.games.serializers import (
    GameReadSerializer,
    GameWriteSerializer,
    GenreCRUDSerializer,
    PlatformCRUDSerializer,
    PublisherCRUDSerializer,
    RatingSerializer,
)


class GameViewSet(ModelViewSet):
    queryset = Game.objects.select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")
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


class RatingCreateView(APIView):
    """
    Allow an authenticated user to create or update their rating for a given game.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Create or update a rating for a game",
        description=("Create a new rating for the given game, or update the existing rating " "for the authenticated user if it already exists."),
        request=RatingSerializer,
        responses={201: RatingSerializer, 200: RatingSerializer},
        examples=[
            OpenApiExample(
                "Star rating example",
                description="Create or update a 4.5 star rating for the game.",
                value={"rating_type": "etoiles", "value": 4.5},
                request_only=True,
            ),
        ],
    )
    def post(self, request, game_id):
        game = get_object_or_404(Game, pk=game_id)

        serializer = RatingSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        rating_type = serializer.validated_data["rating_type"]
        value = serializer.validated_data["value"]

        rating, created = Rating.objects.update_or_create(
            user=request.user,
            game=game,
            defaults={
                "rating_type": rating_type,
                "value": value,
            },
        )

        output = RatingSerializer(rating).data
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK

        return Response(output, status=status_code)


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve a rating",
        responses=RatingSerializer,
    ),
    patch=extend_schema(
        summary="Update a rating",
        request=RatingSerializer,
        responses=RatingSerializer,
    ),
    delete=extend_schema(
        summary="Delete a rating",
        responses={204: None},
    ),
)
class RatingDetailView(RetrieveUpdateDestroyAPIView):
    """
    Allow an authenticated user to retrieve, update or delete their own rating.
    """

    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Rating.objects.filter(user=self.request.user)


class RatingListView(ListAPIView):
    """
    List ratings with optional filtering by user_id and/or game_id.
    """

    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Rating.objects.all()

        user_id = self.request.query_params.get("user_id")
        game_id = self.request.query_params.get("game_id")

        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)
        if game_id is not None:
            queryset = queryset.filter(game_id=game_id)

        return queryset
