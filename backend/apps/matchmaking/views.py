from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.permissions import IsOwnerOrAdmin
from apps.matchmaking.serializers import MatchmakingRequestSerializer


@extend_schema_view(
    list=extend_schema(
        summary="Lister les demandes de matchmaking actives",
        description=(
            "Retourne la liste des demandes de matchmaking encore actives " + "(status=pending et non expirées). " + "Filtrage possible par jeu."
        ),
        parameters=[
            OpenApiParameter(
                name="game",
                description="ID du jeu pour filtrer les demandes",
                required=False,
                type=int,
            ),
        ],
        responses={200: MatchmakingRequestSerializer(many=True)},
    ),
    create=extend_schema(
        summary="Créer une demande de matchmaking",
        description=("Crée une nouvelle demande de matchmaking pour l'utilisateur connecté. " + "`expires_at` doit être dans le futur."),
        responses={201: MatchmakingRequestSerializer},
    ),
    partial_update=extend_schema(
        summary="Modifier une demande de matchmaking",
        description=(
            "Permet de modifier une demande existante (rayon, jeu, statut). "
            "Seul le propriétaire ou un administrateur peut modifier la demande. "
            "Une demande expirée ne peut plus être modifiée."
        ),
        responses={200: MatchmakingRequestSerializer},
    ),
    retrieve=extend_schema(
        summary="Récupérer une demande de matchmaking",
        responses={200: MatchmakingRequestSerializer},
    ),
)
class MatchmakingRequestViewSet(ModelViewSet):
    serializer_class = MatchmakingRequestSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        qs = MatchmakingRequest.objects.all()

        # Expiration automatique globale
        MatchmakingRequest.objects.expire_old()

        # ⚠️ Filtrage UNIQUEMENT pour la liste
        if self.action == "list":
            qs = qs.filter(
                status=MatchmakingRequest.STATUS_PENDING,
                expires_at__gt=timezone.now(),
            )

            game = self.request.query_params.get("game")
            if game:
                qs = qs.filter(game_id=game)

        return qs.order_by("-created_at")

    def perform_update(self, serializer):
        instance = serializer.instance

        if instance.is_expired():
            instance.status = MatchmakingRequest.STATUS_EXPIRED
            instance.save(update_fields=["status"])
            raise serializers.ValidationError("This matchmaking request has expired.")

        serializer.save()
