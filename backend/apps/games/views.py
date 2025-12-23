from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
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
from apps.library.models import UserGame
from apps.reviews.models import Review


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


class GameStatsView(APIView):
    """
    Retourne les statistiques de possession d'un jeu :
    - nombre total d'utilisateurs
    - répartition par statut
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Statistiques de possession d’un jeu",
        description=("Retourne le nombre d'utilisateurs possédant le jeu et la répartition par statut (en cours, terminé, abandonné)."),
        responses={
            200: {
                "type": "object",
                "example": {
                    "game_id": 123,
                    "owners_count": 42,
                    "owners_by_status": {
                        "en_cours": 10,
                        "termine": 25,
                        "abandonne": 7,
                    },
                },
            },
            404: {"description": "Jeu introuvable"},
        },
        examples=[
            OpenApiExample(
                "Exemple de réponse",
                value={
                    "game_id": 123,
                    "owners_count": 42,
                    "owners_by_status": {
                        "en_cours": 10,
                        "termine": 25,
                        "abandonne": 7,
                    },
                },
            )
        ],
    )
    def get(self, request, game_id):
        game = get_object_or_404(Game, id=game_id)

        queryset = UserGame.objects.filter(game=game).values("status").annotate(count=Count("id"))

        owners_count = sum(item["count"] for item in queryset)

        # Initialisation à 0 pour stabilité de l’API
        owners_by_status = {
            "en_cours": 0,
            "termine": 0,
            "abandonne": 0,
        }

        status_mapping = {
            UserGame.GameStatus.EN_COURS: "en_cours",
            UserGame.GameStatus.TERMINE: "termine",
            UserGame.GameStatus.ABANDONNE: "abandonne",
        }

        for item in queryset:
            api_key = status_mapping.get(item["status"])
            if api_key:
                owners_by_status[api_key] = item["count"]

        ratings_data = {
            "average": game.average_rating,
            "count": game.rating_count,
        }

        distribution = {str(i): 0 for i in range(1, 6)}

        stars_qs = Rating.objects.filter(game=game, rating_type=Rating.RATING_TYPE_ETOILES).values("value").annotate(count=Count("id"))

        for item in stars_qs:
            distribution[str(int(item["value"]))] = item["count"]

        ratings_data["distribution"] = distribution

        reviews_qs = Review.objects.filter(game=game)

        reviews_data = {
            "count": reviews_qs.count(),
            "last_created_at": reviews_qs.aggregate(last_created_at=Max("date_created"))["last_created_at"],
        }

        return Response(
            {
                "game_id": game.id,
                "owners_count": owners_count,
                "owners_by_status": owners_by_status,
                "ratings": ratings_data,
                "reviews": reviews_data,
            },
            status=status.HTTP_200_OK,
        )
