from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.games.models import Game, Genre, Platform, Publisher, Rating
from apps.games.permissions import CanDeleteRating, CanReadRating
from apps.games.serializers import (
    GameDetailSerializer,
    GameReadSerializer,
    GameWriteSerializer,
    GenreCRUDSerializer,
    PlatformCRUDSerializer,
    PublisherCRUDSerializer,
    RatingSerializer,
)
from apps.library.models import UserGame
from apps.reviews.models import ContentReport, Review
from apps.reviews.serializers import ContentReportCreateSerializer
from apps.users.models import AdminAction


class GameViewSet(ModelViewSet):
    queryset = Game.objects.select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["name"]
    ordering_fields = [
        "release_date",
        "rating_avg",
        "average_rating",
        "rating_count",
        "popularity_score",
    ]
    ordering = ["-popularity_score"]

    def get_serializer_class(self):
        if self.action == "list":
            return GameReadSerializer
        if self.action == "retrieve":
            return GameDetailSerializer
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
        description="Create a new rating for the given game, or update the existing rating for the authenticated user if it already exists.",
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


class AdminRatingListView(APIView):
    """
    Endpoint admin pour lister toutes les notes (ratings).

    GET /api/admin/ratings
    """

    permission_classes = [CanReadRating]

    def get(self, request):
        queryset = Rating.objects.select_related("user", "game").all()

        user_id = request.query_params.get("user_id")
        game_id = request.query_params.get("game_id")

        if user_id is not None:
            queryset = queryset.filter(user_id=user_id)
        if game_id is not None:
            queryset = queryset.filter(game_id=game_id)

        serializer = RatingSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminRatingDetailView(APIView):
    """
    Endpoint admin pour supprimer une note spécifique.

    DELETE /api/admin/ratings/{id}
    """

    permission_classes = [CanDeleteRating]

    def delete(self, request, pk: int):
        rating = get_object_or_404(Rating, pk=pk)

        AdminAction.objects.create(
            admin_user=request.user,
            action_type="rating.delete",
            target_type="rating",
            target_id=rating.pk,
            description=f"Rating supprimée par admin (id={request.user.id})",
        )

        rating.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RatingReportView(APIView):
    """
    Permet à un utilisateur connecté de signaler une note (rating).

    POST /api/ratings/{id}/report
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        rating = get_object_or_404(Rating, pk=pk)

        serializer = ContentReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report, created = ContentReport.objects.get_or_create(
            reporter=request.user,
            target_type=ContentReport.TargetType.RATING,
            target_id=rating.pk,
            defaults={"reason": serializer.validated_data["reason"]},
        )

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        payload = {
            "id": report.id,
            "already_reported": not created,
        }
        return Response(payload, status=status_code)


class GameStatsView(APIView):
    """
    Statistiques complètes d’un jeu :
    - possession (owners)
    - notes (ratings)
    - avis (reviews)
    """

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Statistiques complètes d’un jeu",
        description=(
            "Retourne les statistiques de possession, de notation et d’avis pour un jeu donné.\n\n"
            "- **Possession** : nombre total d’utilisateurs et répartition par statut\n"
            "- **Notes** : moyenne, nombre de votes et distribution (1 à 5 étoiles)\n"
            "- **Avis** : nombre total et date du dernier avis"
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "game_id": {"type": "integer", "example": 123},
                    "owners_count": {"type": "integer", "example": 42},
                    "owners_by_status": {
                        "type": "object",
                        "properties": {
                            "en_cours": {"type": "integer", "example": 10},
                            "termine": {"type": "integer", "example": 25},
                            "abandonne": {"type": "integer", "example": 7},
                        },
                    },
                    "ratings": {
                        "type": "object",
                        "properties": {
                            "average": {"type": "number", "format": "float", "example": 8.2},
                            "count": {"type": "integer", "example": 134},
                            "distribution": {
                                "type": "object",
                                "properties": {
                                    "1": {"type": "integer", "example": 2},
                                    "2": {"type": "integer", "example": 5},
                                    "3": {"type": "integer", "example": 20},
                                    "4": {"type": "integer", "example": 60},
                                    "5": {"type": "integer", "example": 47},
                                },
                            },
                        },
                    },
                    "reviews": {
                        "type": "object",
                        "properties": {
                            "count": {"type": "integer", "example": 56},
                            "last_created_at": {
                                "type": "string",
                                "format": "date-time",
                                "example": "2025-09-12T10:15:00Z",
                            },
                        },
                    },
                },
            },
            404: {"description": "Jeu introuvable"},
        },
        examples=[
            OpenApiExample(
                "Réponse complète",
                value={
                    "game_id": 123,
                    "owners_count": 42,
                    "owners_by_status": {
                        "en_cours": 10,
                        "termine": 25,
                        "abandonne": 7,
                    },
                    "ratings": {
                        "average": 8.2,
                        "count": 134,
                        "distribution": {
                            "1": 2,
                            "2": 5,
                            "3": 20,
                            "4": 60,
                            "5": 47,
                        },
                    },
                    "reviews": {
                        "count": 56,
                        "last_created_at": "2025-09-12T10:15:00Z",
                    },
                },
            )
        ],
    )
    def get(self, request, game_id):
        """
        Retourne les statistiques d'un jeu.
        """
        use_cache = not settings.DEBUG

        if use_cache:
            cache_key = f"game:stats:{game_id}"
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

        game = get_object_or_404(Game, id=game_id)

        # ---------- OWNERS ----------
        owners_qs = UserGame.objects.filter(game=game).values("status").annotate(count=Count("id"))

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

        owners_count = 0
        for row in owners_qs:
            owners_count += row["count"]
            api_key = status_mapping.get(row["status"])
            if api_key:
                owners_by_status[api_key] = row["count"]

        # ---------- RATINGS ----------
        ratings_distribution = {str(i): 0 for i in range(1, 6)}

        stars_qs = Rating.objects.filter(game=game, rating_type=Rating.RATING_TYPE_ETOILES).values("value").annotate(count=Count("id"))

        for row in stars_qs:
            ratings_distribution[str(int(row["value"]))] = row["count"]

        ratings_data = {
            "average": game.average_rating,
            "count": game.rating_count,
            "distribution": ratings_distribution,
        }

        # ---------- REVIEWS ----------
        reviews_agg = Review.objects.filter(game=game).aggregate(
            count=Count("id"),
            last_created_at=Max("date_created"),
        )

        reviews_data = {
            "count": reviews_agg["count"],
            "last_created_at": reviews_agg["last_created_at"],
        }

        response_data = {
            "game_id": game.id,
            "owners_count": owners_count,
            "owners_by_status": owners_by_status,
            "ratings": ratings_data,
            "reviews": reviews_data,
        }

        if use_cache:
            cache_key = f"game:stats:{game_id}"
            cache.set(cache_key, response_data, timeout=300)

        return Response(response_data, status=status.HTTP_200_OK)
