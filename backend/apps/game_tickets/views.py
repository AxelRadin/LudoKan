from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated

from apps.game_tickets.models import GameTicket
from apps.game_tickets.serializers import GameTicketCreateSerializer


@extend_schema_view(
    post=extend_schema(
        tags=["Game tickets"],
        summary="Créer un ticket de demande d’ajout de jeu",
        description=(
            "Permet à un utilisateur authentifié de créer un ticket "
            "de demande d’ajout de jeu.\n\n"
            "- Le statut initial est **pending**\n"
            "- L’utilisateur est automatiquement associé au ticket\n"
        ),
        request=GameTicketCreateSerializer,
        responses={
            201: GameTicketCreateSerializer,
            400: OpenApiResponse(description="Données invalides"),
            401: OpenApiResponse(description="Authentification requise"),
        },
    )
)
class GameTicketCreateAPIView(CreateAPIView):
    queryset = GameTicket.objects.all()
    serializer_class = GameTicketCreateSerializer
    permission_classes = [IsAuthenticated]
