from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.permissions import IsOwnerOrAdmin
from apps.matchmaking.serializers import MatchmakingRequestSerializer, MatchResultSerializer
from apps.matchmaking.utils import find_matches


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


class MatchmakingMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Demande active de l'utilisateur
        user_request = (
            MatchmakingRequest.objects.filter(
                user=request.user,
                status=MatchmakingRequest.STATUS_PENDING,
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )

        if not user_request:
            return Response(
                {"detail": "Aucune demande de matchmaking active."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Matching
        matches_with_distance = find_matches(user_request)

        matches = [req for req, _ in matches_with_distance]
        distances = {req.id: distance for req, distance in matches_with_distance}

        # 3. Tri par distance croissante
        matches.sort(key=lambda r: distances[r.id])

        # 4. Sérialisation
        serializer = MatchResultSerializer(
            matches,
            many=True,
            context={"distances": distances},
        )

        return Response(serializer.data, status=status.HTTP_200_OK)
