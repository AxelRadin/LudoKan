from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, Max
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiExample, extend_schema, extend_schema_view
from rest_framework import filters, status
from rest_framework.generics import ListAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.core.reports_export import MSG_EXPORT_FORBIDDEN, PERMISSION_REPORTS_EXPORT, build_games_csv, build_games_pdf
from apps.games.filters import GameFilter
from apps.games.models import Game, Genre, Platform, Publisher, Rating
from apps.games.permissions import CanDeleteRating, CanReadGame, CanReadRating
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
from apps.users.permissions import IsAdminWithPermission, has_permission
from apps.users.utils import log_admin_action


class GameViewSet(ModelViewSet):
    queryset = (
        Game.objects.select_related("publisher")
        .prefetch_related("genres", "platforms")
        .order_by("-popularity_score")
        .distinct()  # Éviter les doublons lors de filtrage Many-to-Many
    )
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = GameFilter  # Utiliser le FilterSet personnalisé
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


class GameByIgdbIdView(APIView):
    """
    Retrieve a game by its IGDB ID.
    """

    permission_classes = [AllowAny]

    def get(self, request, igdb_id):
        game = get_object_or_404(Game, igdb_id=igdb_id)
        from .serializers import GameDetailSerializer

        serializer = GameDetailSerializer(game, context={"request": request})
        return Response(serializer.data)


class ImportIgdbGameView(APIView):
    """
    Find or create a Game in Django from IGDB data.
    Returns the Django game ID so the caller can add it to the library.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        igdb_id = request.data.get("igdb_id")
        name = request.data.get("name", "")
        cover_url = request.data.get("cover_url") or None
        release_date = request.data.get("release_date") or None

        if not igdb_id:
            return Response({"error": "igdb_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        publisher, _ = Publisher.objects.get_or_create(
            name="IGDB",
            defaults={"description": "Jeux importés depuis IGDB"},
        )

        game, _ = Game.objects.get_or_create(
            igdb_id=igdb_id,
            defaults={
                "name": name,
                "cover_url": cover_url,
                "release_date": release_date,
                "publisher": publisher,
            },
        )

        return Response({"id": game.id}, status=status.HTTP_200_OK)


class AdminGameListView(ListAPIView):
    """
    Endpoint admin pour lister les jeux.

    GET /api/admin/games
    """

    serializer_class = GameReadSerializer
    permission_classes = [CanReadGame]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = [
        "release_date",
        "rating_avg",
        "average_rating",
        "rating_count",
        "popularity_score",
        "created_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Game.objects.select_related("publisher").prefetch_related("genres", "platforms").all()

        name = self.request.query_params.get("name")
        publisher_id = self.request.query_params.get("publisher_id")
        status_param = self.request.query_params.get("status")
        min_rating = self.request.query_params.get("min_rating")
        max_rating = self.request.query_params.get("max_rating")
        created_before = self.request.query_params.get("created_before")
        created_after = self.request.query_params.get("created_after")

        if name:
            qs = qs.filter(name__icontains=name)
        if publisher_id:
            qs = qs.filter(publisher_id=publisher_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if min_rating:
            try:
                qs = qs.filter(average_rating__gte=float(min_rating))
            except ValueError:
                pass
        if max_rating:
            try:
                qs = qs.filter(average_rating__lte=float(max_rating))
            except ValueError:
                pass
        if created_before:
            qs = qs.filter(created_at__lte=created_before)
        if created_after:
            qs = qs.filter(created_at__gte=created_after)

        return qs


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

        log_admin_action(
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


def _build_games_report_payload():
    """Construit le payload du rapport jeux (réduit complexité cognitive de get())."""
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    popular_games = list(
        Game.objects.annotate(owners_count=Count("user_games")).order_by("-owners_count")[:10].values("id", "name", "average_rating", "owners_count")
    )
    top_genres = list(Genre.objects.annotate(games_count=Count("games")).order_by("-games_count")[:10].values("id", "nom_genre", "games_count"))
    ratings_agg = Rating.objects.aggregate(
        average=Avg("normalized_value"),
        total_count=Count("id"),
    )
    ratings_summary = {
        "average": round(float(ratings_agg["average"] or 0), 2),
        "total_count": ratings_agg["total_count"] or 0,
    }
    reviews_recent = Review.objects.filter(date_created__gte=month_ago).count()
    platforms_breakdown = list(
        Platform.objects.annotate(games_count=Count("games")).order_by("-games_count").values("id", "nom_plateforme", "games_count")
    )
    return {
        "popular_games": popular_games,
        "top_genres": top_genres,
        "ratings_summary": ratings_summary,
        "reviews_recent": reviews_recent,
        "platforms_breakdown": platforms_breakdown,
    }


def _handle_games_export(request, data):
    """Gère l'export CSV/PDF du rapport jeux. Retourne une Response ou None si pas d'export."""
    export = request.query_params.get("export")
    if export == "csv":
        if not has_permission(request.user, PERMISSION_REPORTS_EXPORT):
            return Response({"detail": MSG_EXPORT_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        content = build_games_csv(data)
        resp = HttpResponse(content.encode("utf-8"), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="report_games.csv"'
        return resp
    if export == "pdf":
        if not has_permission(request.user, PERMISSION_REPORTS_EXPORT):
            return Response({"detail": MSG_EXPORT_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        content = build_games_pdf(data)
        resp = HttpResponse(content, content_type="application/pdf")
        resp["Content-Disposition"] = 'attachment; filename="report_games.pdf"'
        return resp
    return None


class AdminReportsGamesView(APIView):
    """
    Rapport détaillé jeux pour les rapports planifiés (BACK-021C).

    GET /api/admin/reports/games/

    Réponse :
    {
      "popular_games": [ { "id", "name", "owners_count", "average_rating" }, ... ],
      "top_genres": [ { "id", "nom_genre", "games_count" }, ... ],
      "ratings_summary": { "average": 7.2, "total_count": 500 },
      "reviews_recent": 120,
      "platforms_breakdown": [ { "id", "nom_plateforme", "games_count" }, ... ]
    }
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "dashboard.view"

    def get(self, request):
        cache_timeout = getattr(settings, "ADMIN_REPORTS_GAMES_CACHE_TIMEOUT", 60)
        use_cache = cache_timeout > 0
        cache_key = "admin:reports:games"

        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                export_response = _handle_games_export(request, cached_data)
                if export_response is not None:
                    return export_response
                return Response(cached_data, status=status.HTTP_200_OK)

        payload = _build_games_report_payload()
        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

        export_response = _handle_games_export(request, payload)
        if export_response is not None:
            return export_response
        return Response(payload, status=status.HTTP_200_OK)


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
