from django.core.exceptions import ValidationError
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.game_tickets.models import GameTicket
from apps.game_tickets.permissions import CanReadTicket, IsStaff
from apps.game_tickets.serializers import (
    AdminGameTicketListSerializer,
    GameTicketAttachmentCreateSerializer,
    GameTicketCreateSerializer,
    GameTicketListSerializer,
    GameTicketStatusUpdateSerializer,
)


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


@extend_schema(
    tags=["Game tickets – Workflow"],
    summary="Modifier le statut d’un ticket",
    description=(
        "Permet à un utilisateur **staff** de faire évoluer le statut d’un ticket "
        "selon le workflow autorisé.\n\n"
        "### Transitions possibles\n"
        "- pending → reviewing\n"
        "- reviewing → approved\n"
        "- reviewing → rejected\n"
        "- approved → published\n\n"
        "Toute transition invalide retourne une erreur."
    ),
    request=GameTicketStatusUpdateSerializer,
    responses={
        200: OpenApiResponse(description="Statut mis à jour avec succès"),
        400: OpenApiResponse(description="Transition invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Réservé aux utilisateurs staff"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class GameTicketStatusUpdateAPIView(APIView):
    permission_classes = [IsStaff]

    def post(self, request, pk):
        serializer = GameTicketStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]

        try:
            ticket = GameTicket.objects.get(pk=pk)
            ticket.change_status(new_status)
        except GameTicket.DoesNotExist:
            return Response(
                {"detail": "Ticket not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "id": ticket.id,
                "status": ticket.status,
            },
            status=status.HTTP_200_OK,
        )


class AdminGameTicketListView(ListAPIView):
    """
    Endpoint admin pour lister tous les tickets de jeux.

    GET /api/admin/tickets
    """

    serializer_class = AdminGameTicketListSerializer
    permission_classes = [CanReadTicket]

    def get_queryset(self):
        qs = GameTicket.objects.select_related("user").prefetch_related("genres", "platforms").all().order_by("-created_at")

        status_param = self.request.query_params.get("status")
        user_id = self.request.query_params.get("user_id")
        game_name = self.request.query_params.get("game_name")
        created_before = self.request.query_params.get("created_before")
        created_after = self.request.query_params.get("created_after")

        if status_param:
            qs = qs.filter(status=status_param)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if game_name:
            qs = qs.filter(game_name__icontains=game_name)
        if created_before:
            qs = qs.filter(created_at__lte=created_before)
        if created_after:
            qs = qs.filter(created_at__gte=created_after)

        return qs
