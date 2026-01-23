from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from apps.game_tickets.models import GameTicket
from apps.game_tickets.serializers import GameTicketAttachmentCreateSerializer, GameTicketCreateSerializer, GameTicketListSerializer


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


@extend_schema_view(
    get=extend_schema(
        tags=["Game tickets"],
        summary="Lister mes demandes d’ajout de jeu",
        description=("Retourne la liste paginée des tickets d’ajout de jeu " + "créés par l’utilisateur authentifié, triés par date décroissante."),
    )
)
class GameTicketListAPIView(ListAPIView):
    serializer_class = GameTicketListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return GameTicket.objects.filter(user=self.request.user).order_by("-created_at")


@extend_schema(
    tags=["Game tickets"],
    summary="Uploader une pièce jointe à un ticket",
    description="Upload d’une image liée à un ticket existant (png, jpeg, webp).",
    request=GameTicketAttachmentCreateSerializer,
    responses={
        201: GameTicketAttachmentCreateSerializer,
        400: OpenApiResponse(description="Fichier invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Permission refusée"),
    },
)
class GameTicketAttachmentCreateView(generics.CreateAPIView):
    serializer_class = GameTicketAttachmentCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        ticket = GameTicket.objects.get(pk=self.kwargs["pk"])

        if ticket.user != self.request.user:
            raise PermissionDenied("You cannot upload files for this ticket.")

        serializer.save(ticket=ticket)
