from urllib.parse import urlencode

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from apps.games.models import Rating
from apps.library.models import UserGame
from apps.reviews.models import ContentReport, Review
from apps.reviews.permissions import CanDeleteReview, CanEditReport, CanEditReview, CanReadReport, CanReadReview
from apps.reviews.serializers import (
    ContentReportAdminSerializer,
    ContentReportCreateSerializer,
    ReviewReadSerializer,
    ReviewWriteSerializer,
    build_rating_only_review_entry,
)
from apps.users.utils import log_admin_action


def _parse_optional_query_int(raw: str | None) -> int | None:
    """Entier depuis un query param ; None si absent ou non convertible."""
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _parse_rating_value_filter(raw: str | None) -> int | None:
    """Retourne un entier 1–5 si le paramètre est valide, sinon None."""
    if raw is None:
        return None
    try:
        v = int(raw)
    except (TypeError, ValueError):
        return None
    if 1 <= v <= 5:
        return v
    return None


def _parse_list_page(raw_page: str | None) -> int:
    try:
        return max(1, int(raw_page or 1))
    except (TypeError, ValueError):
        return 1


def _merged_review_rows_for_game(game_id: int, rating_val: int | None) -> list[tuple[str, Review | Rating]]:
    """Avis texte + notes orphelines, triées par date_created décroissante."""
    reviews_qs = Review.objects.select_related("user", "game", "rating").filter(game_id=game_id).order_by("-date_created")
    if rating_val is not None:
        reviews_qs = reviews_qs.filter(rating__value=rating_val)

    reviewed_user_ids = Review.objects.filter(game_id=game_id).values_list("user_id", flat=True)
    orphans_qs = (
        Rating.objects.select_related("user", "game")
        .filter(game_id=game_id, rating_type=Rating.RATING_TYPE_ETOILES)
        .exclude(user_id__in=reviewed_user_ids)
        .order_by("-date_created")
    )
    if rating_val is not None:
        orphans_qs = orphans_qs.filter(value=rating_val)

    rows: list[tuple[str, Review | Rating]] = [("rev", r) for r in reviews_qs]
    rows.extend(("rt", rt) for rt in orphans_qs)
    rows.sort(key=lambda t: t[1].date_created, reverse=True)
    return rows


def _reviews_merged_page_url(request, game_id_int: int, page: int, rating_val: int | None) -> str:
    pdict: dict[str, str] = {"game": str(game_id_int), "page": str(page)}
    if rating_val is not None:
        pdict["rating_value"] = str(rating_val)
    return f"{request.path}?{urlencode(pdict)}"


def _serialize_merged_row(kind: str, obj: Review | Rating, ctx: dict, request) -> dict:
    if kind == "rev":
        return ReviewReadSerializer(obj, context=ctx).data
    return build_rating_only_review_entry(obj, request)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gerer les reviews.

    Endpoints disponibles :
    - GET    /api/reviews/          : Liste toutes les reviews
    - POST   /api/reviews/          : Creer une review (authentifie)
    - GET    /api/reviews/{id}/     : Detail d'une review
    - PUT    /api/reviews/{id}/     : Modifier une review (proprietaire uniquement)
    - PATCH  /api/reviews/{id}/     : Modification partielle (proprietaire uniquement)
    - DELETE /api/reviews/{id}/     : Supprimer une review (proprietaire uniquement)

    Filtres disponibles :
    - ?game=<id>  : Filtrer par jeu
    - ?user=<id>  : Filtrer par utilisateur
    - ?rating_value=<1-5>  : Filtre sur la note (avis + entrées « note seule » sans texte)
    """

    queryset = Review.objects.select_related("user", "game", "rating").all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        """
        Utilise ReadSerializer pour GET, WriteSerializer pour POST/PUT/PATCH.
        """
        if self.action in ["list", "retrieve"]:
            return ReviewReadSerializer
        return ReviewWriteSerializer

    def get_queryset(self):
        """
        Permet de filtrer les reviews par jeu ou par utilisateur.
        Exemples :
        - /api/reviews/?game=5
        - /api/reviews/?user=3
        """
        queryset = super().get_queryset()
        params = self.request.query_params

        gid = _parse_optional_query_int(params.get("game"))
        if gid is not None:
            queryset = queryset.filter(game_id=gid)

        uid = _parse_optional_query_int(params.get("user"))
        if uid is not None:
            queryset = queryset.filter(user_id=uid)

        stars = _parse_rating_value_filter(params.get("rating_value"))
        if stars is not None:
            queryset = queryset.filter(rating__value=stars)

        return queryset

    def list(self, request, *args, **kwargs):
        """
        Liste fusionnée : avis du jeu + notes étoiles sans avis texte (même forme JSON),
        tri par date, pagination identique à DRF. Sauté si ?user= (ex. avis de l'utilisateur).
        """
        game_id = request.query_params.get("game")
        user_filter = request.query_params.get("user")
        if not game_id or user_filter is not None:
            return super().list(request, *args, **kwargs)

        try:
            game_id_int = int(game_id)
        except (TypeError, ValueError):
            return super().list(request, *args, **kwargs)

        rating_val = _parse_rating_value_filter(request.query_params.get("rating_value"))
        page = _parse_list_page(request.query_params.get("page"))
        page_size = api_settings.PAGE_SIZE

        rows = _merged_review_rows_for_game(game_id_int, rating_val)
        total = len(rows)
        start = (page - 1) * page_size
        end = start + page_size
        page_rows = rows[start:end]

        ctx = self.get_serializer_context()
        results = [_serialize_merged_row(kind, obj, ctx, request) for kind, obj in page_rows]

        previous = _reviews_merged_page_url(request, game_id_int, page - 1, rating_val) if page > 1 else None
        next_url = _reviews_merged_page_url(request, game_id_int, page + 1, rating_val) if end < total else None

        return Response(
            {
                "count": total,
                "next": request.build_absolute_uri(next_url) if next_url else None,
                "previous": request.build_absolute_uri(previous) if previous else None,
                "results": results,
            }
        )

    def perform_create(self, serializer):
        """
        Associe automatiquement l'utilisateur connecte lors de la creation.
        Si l'utilisateur n'a pas encore de UserGame pour ce jeu,
        en crée un avec le statut TERMINE (notation implicite).
        """
        review = serializer.save(user=self.request.user)
        UserGame.objects.get_or_create(
            user=self.request.user,
            game=review.game,
            defaults={"status": UserGame.GameStatus.TERMINE},
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read_serializer = ReviewReadSerializer(
            serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        read_serializer = ReviewReadSerializer(
            serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read_serializer.data)

    def get_permissions(self):
        """
        Permissions :
        - Lecture (GET) : Tout le monde
        - Creation (POST) : Utilisateurs authentifies
        - Modification/Suppression (PUT/PATCH/DELETE) : Proprietaire uniquement
        """
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return super().get_permissions()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisee : seul le proprietaire peut modifier/supprimer.
    """

    def has_object_permission(self, request, view, obj):
        # Lecture autorisee pour tout le monde
        if request.method in permissions.SAFE_METHODS:
            return True

        # Modification/suppression : uniquement le proprietaire
        return obj.user == request.user


class AdminReviewListView(APIView):
    """
    Endpoint admin pour lister les reviews.

    GET /api/admin/reviews
    """

    permission_classes = [CanReadReview]

    def get(self, request):
        queryset = Review.objects.select_related("user", "game", "rating").all()

        game_id = request.query_params.get("game")
        if game_id:
            queryset = queryset.filter(game_id=game_id)

        user_id = request.query_params.get("user")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        serializer = ReviewReadSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminReviewDetailView(APIView):
    """
    Endpoints admin pour lire / modifier / supprimer une review spécifique.

    - GET    /api/admin/reviews/{id}
    - PATCH  /api/admin/reviews/{id}
    - DELETE /api/admin/reviews/{id}
    """

    def get_permissions(self):
        if self.request.method == "GET":
            permission_classes = [CanReadReview]
        elif self.request.method == "PATCH":
            permission_classes = [CanEditReview]
        elif self.request.method == "DELETE":
            permission_classes = [CanDeleteReview]
        else:
            permission_classes = []
        return [permission() for permission in permission_classes]

    def get_object(self, pk: int) -> Review:
        from django.shortcuts import get_object_or_404

        return get_object_or_404(Review, pk=pk)

    def get(self, request, pk: int):
        review = self.get_object(pk)
        serializer = ReviewReadSerializer(review)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk: int):
        review = self.get_object(pk)
        serializer = ReviewWriteSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Log d'action admin
        log_admin_action(
            admin_user=request.user,
            action_type="review.edit",
            target_type="review",
            target_id=review.pk,
            description=f"Review modifiée par admin (id={request.user.id})",
        )

        return Response(ReviewReadSerializer(review).data, status=status.HTTP_200_OK)

    def delete(self, request, pk: int):
        review = self.get_object(pk)

        # Log avant suppression pour conserver l'ID
        log_admin_action(
            admin_user=request.user,
            action_type="review.delete",
            target_type="review",
            target_id=review.pk,
            description=f"Review supprimée par admin (id={request.user.id})",
        )

        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewReportView(APIView):
    """
    Permet à un utilisateur connecté de signaler une review.

    POST /api/reviews/{id}/report
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        review = get_object_or_404(Review, pk=pk)

        serializer = ContentReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        report, created = ContentReport.objects.get_or_create(
            reporter=request.user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.pk,
            defaults={"reason": serializer.validated_data["reason"]},
        )

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        payload = {
            "id": report.id,
            "already_reported": not created,
        }
        return Response(payload, status=status_code)


class AdminReportListView(APIView):
    """
    Endpoint admin pour lister les signalements (reviews + ratings).

    GET /api/admin/reports
    """

    permission_classes = [CanReadReport]

    def get(self, request):
        queryset = ContentReport.objects.select_related("reporter").all()

        target_type = request.query_params.get("target_type")
        target_id = request.query_params.get("target_id")
        reporter_id = request.query_params.get("reporter")
        handled = request.query_params.get("handled")

        if target_type:
            queryset = queryset.filter(target_type=target_type)
        if target_id:
            queryset = queryset.filter(target_id=target_id)
        if reporter_id:
            queryset = queryset.filter(reporter_id=reporter_id)
        if handled is not None:
            if handled.lower() in {"true", "1"}:
                queryset = queryset.filter(handled=True)
            elif handled.lower() in {"false", "0"}:
                queryset = queryset.filter(handled=False)

        serializer = ContentReportAdminSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminReportDetailView(APIView):
    """
    Endpoint admin pour marquer un signalement comme traité.

    PATCH /api/admin/reports/{id}
    """

    permission_classes = [CanEditReport]

    def patch(self, request, pk: int):
        report = get_object_or_404(ContentReport, pk=pk)

        handled = request.data.get("handled")
        if handled is not None:
            handled_bool = bool(handled) if isinstance(handled, bool) else str(handled).lower() in {"true", "1"}
            report.handled = handled_bool
            if handled_bool:
                report.handled_by = request.user
                report.handled_at = timezone.now()
            else:
                report.handled_by = None
                report.handled_at = None

        report.save()
        serializer = ContentReportAdminSerializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)
