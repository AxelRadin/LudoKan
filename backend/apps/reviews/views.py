from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reviews.models import ContentReport, Review
from apps.reviews.permissions import CanDeleteReview, CanEditReport, CanEditReview, CanReadReport, CanReadReview
from apps.reviews.serializers import ContentReportAdminSerializer, ContentReportCreateSerializer, ReviewReadSerializer, ReviewWriteSerializer
from apps.users.utils import log_admin_action


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

        # Filtre par jeu
        game_id = self.request.query_params.get("game")
        if game_id:
            queryset = queryset.filter(game_id=game_id)

        # Filtre par utilisateur
        user_id = self.request.query_params.get("user")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset

    def perform_create(self, serializer):
        """
        Associe automatiquement l'utilisateur connecte lors de la creation.
        """
        serializer.save(user=self.request.user)

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
