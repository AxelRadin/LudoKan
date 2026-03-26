from django.utils import timezone
from django_fsm import TransitionNotAllowed
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import CreateAPIView, ListAPIView, UpdateAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.game_tickets.constants import TICKET_NOT_FOUND_MESSAGE, TicketPermission
from apps.game_tickets.models import GameTicket, GameTicketComment, GameTicketHistory
from apps.game_tickets.permissions import CanReadTicket
from apps.game_tickets.serializers import (
    AdminGameTicketListSerializer,
    AdminGameTicketUpdateSerializer,
    GameTicketAttachmentCreateSerializer,
    GameTicketCommentSerializer,
    GameTicketCreateSerializer,
    GameTicketHistorySerializer,
    GameTicketListSerializer,
    GameTicketStatusUpdateSerializer,
)
from apps.users.permissions import IsAdminWithPermission
from apps.users.utils import log_admin_action


@extend_schema_view(
    post=extend_schema(
        tags=["Game tickets"],
        summary="Créer un ticket de demande d'ajout de jeu",
        description=(
            "Permet à un utilisateur authentifié de créer un ticket "
            "de demande d'ajout de jeu.\n\n"
            "- Le statut initial est **pending**\n"
            "- L'utilisateur est automatiquement associé au ticket\n"
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
        summary="Lister mes demandes d'ajout de jeu",
        description=("Retourne la liste paginée des tickets d'ajout de jeu " + "créés par l'utilisateur authentifié, triés par date décroissante."),
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
    description="Upload d'une image liée à un ticket existant (png, jpeg, webp).",
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
    summary="Passer un ticket en review",
    description=(
        "Permet à un utilisateur **staff** de passer un ticket du statut **pending** "
        "au statut **reviewing**.\n\n"
        "- Transition : pending → reviewing\n"
        "- Le reviewer est automatiquement défini\n"
    ),
    request=None,
    responses={
        200: AdminGameTicketListSerializer,
        400: OpenApiResponse(description="Transition invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Réservé aux utilisateurs staff"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class GameTicketStartReviewAPIView(APIView):
    permission_classes = [IsAdminWithPermission]
    required_permission = TicketPermission.CHANGE_STATUS

    def post(self, request, pk):
        try:
            ticket = GameTicket.objects.get(pk=pk)
            old_status = ticket.status

            ticket.reviewer = request.user
            ticket.start_review()
            ticket.save()

            log_admin_action(
                admin_user=request.user,
                action_type="ticket.start_review",
                target_type="game_ticket",
                target_id=ticket.pk,
                description=f"Changement de statut {old_status} → {ticket.status} via API",
            )

            serializer = AdminGameTicketListSerializer(ticket)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except GameTicket.DoesNotExist:
            return Response(
                {"detail": TICKET_NOT_FOUND_MESSAGE},
                status=status.HTTP_404_NOT_FOUND,
            )

        except TransitionNotAllowed:
            return Response(
                {"detail": "Invalid status transition. Ticket must be in PENDING status."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Game tickets – Workflow"],
    summary="Approuver un ticket",
    description=(
        "Permet à un utilisateur **staff** de passer un ticket du statut **reviewing** "
        "au statut **approved**.\n\n"
        "- Transition : reviewing → approved\n"
        "- Le reviewer est automatiquement défini\n"
    ),
    request=None,
    responses={
        200: AdminGameTicketListSerializer,
        400: OpenApiResponse(description="Transition invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Réservé aux utilisateurs staff"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class GameTicketApproveAPIView(APIView):
    permission_classes = [IsAdminWithPermission]
    required_permission = TicketPermission.CHANGE_STATUS

    def post(self, request, pk):
        try:
            ticket = GameTicket.objects.get(pk=pk)
            old_status = ticket.status

            ticket.approve()
            ticket.reviewer = request.user
            ticket.reviewed_at = timezone.now()
            ticket.save()

            log_admin_action(
                admin_user=request.user,
                action_type="ticket.approve",
                target_type="game_ticket",
                target_id=ticket.pk,
                description=f"Changement de statut {old_status} → {ticket.status} via API",
            )

            serializer = AdminGameTicketListSerializer(ticket)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except GameTicket.DoesNotExist:
            return Response(
                {"detail": TICKET_NOT_FOUND_MESSAGE},
                status=status.HTTP_404_NOT_FOUND,
            )

        except TransitionNotAllowed:
            return Response(
                {"detail": "Invalid status transition. Ticket must be in REVIEWING status."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Game tickets – Workflow"],
    summary="Rejeter un ticket",
    description=(
        "Permet à un utilisateur **staff** de passer un ticket du statut **reviewing** "
        "au statut **rejected**.\n\n"
        "- Transition : reviewing → rejected\n"
        "- **rejection_reason est obligatoire**\n"
        "- Le reviewer est automatiquement défini\n"
    ),
    request=GameTicketStatusUpdateSerializer,
    responses={
        200: AdminGameTicketListSerializer,
        400: OpenApiResponse(description="rejection_reason requise ou transition invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Réservé aux utilisateurs staff"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class GameTicketRejectAPIView(APIView):
    permission_classes = [IsAdminWithPermission]
    required_permission = TicketPermission.CHANGE_STATUS

    def post(self, request, pk):
        serializer = GameTicketStatusUpdateSerializer(data=request.data, context={"action": "reject"})
        serializer.is_valid(raise_exception=True)

        rejection_reason = serializer.validated_data.get("rejection_reason")

        try:
            ticket = GameTicket.objects.get(pk=pk)
            old_status = ticket.status

            ticket.rejection_reason = rejection_reason
            ticket.reviewer = request.user
            ticket.reviewed_at = timezone.now()

            ticket.reject()
            ticket.save()

            log_admin_action(
                admin_user=request.user,
                action_type="ticket.reject",
                target_type="game_ticket",
                target_id=ticket.pk,
                description=f"Changement de statut {old_status} → {ticket.status} via API. Raison: {rejection_reason}",
            )

            response_serializer = AdminGameTicketListSerializer(ticket)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except GameTicket.DoesNotExist:
            return Response(
                {"detail": TICKET_NOT_FOUND_MESSAGE},
                status=status.HTTP_404_NOT_FOUND,
            )
        except TransitionNotAllowed:
            return Response(
                {"detail": f"Invalid status transition. Ticket must be in {GameTicket.Status.REVIEWING} status."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema(
    tags=["Game tickets – Admin"],
    summary="Publier un ticket approuvé (Admin)",
    description=("Permet à un utilisateur **staff** de passer un ticket du statut **approved** au statut **published**."),
    request=None,
    responses={
        200: AdminGameTicketListSerializer,
        400: OpenApiResponse(description="Transition invalide"),
        401: OpenApiResponse(description="Authentification requise"),
        403: OpenApiResponse(description="Réservé aux utilisateurs staff"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class GameTicketPublishAPIView(APIView):
    permission_classes = [IsAdminWithPermission]
    required_permission = TicketPermission.CHANGE_STATUS

    def post(self, request, pk):
        try:
            ticket = GameTicket.objects.get(pk=pk)
            old_status = ticket.status

            ticket.publish()
            ticket.save()

            log_admin_action(
                admin_user=request.user,
                action_type="ticket.publish",
                target_type="game_ticket",
                target_id=ticket.pk,
                description=f"Changement de statut {old_status} → {ticket.status} via API",
            )

            serializer = AdminGameTicketListSerializer(ticket)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except GameTicket.DoesNotExist:
            return Response(
                {"detail": TICKET_NOT_FOUND_MESSAGE},
                status=status.HTTP_404_NOT_FOUND,
            )

        except TransitionNotAllowed:
            return Response(
                {"detail": "Invalid status transition. Ticket must be in APPROVED status."},
                status=status.HTTP_400_BAD_REQUEST,
            )


@extend_schema_view(
    get=extend_schema(
        tags=["Game tickets – Admin"],
        summary="Lister tous les tickets (admin)",
        description=(
            "Endpoint admin pour lister tous les tickets de jeux avec filtres.\n\n"
            "### Filtres disponibles\n"
            "- `?status=pending` : Filtrer par statut\n"
            "- `?user_id=123` : Filtrer par utilisateur\n"
            "- `?game_name=test` : Recherche dans le titre du jeu\n"
            "- `?created_before=2025-01-01` : Tickets créés avant cette date\n"
            "- `?created_after=2025-01-01` : Tickets créés après cette date\n"
        ),
    )
)
class AdminGameTicketListView(ListAPIView):
    """
    Endpoint admin pour lister tous les tickets de jeux.

    GET /api/admin/game-tickets/
    """

    serializer_class = AdminGameTicketListSerializer
    permission_classes = [CanReadTicket]

    def get_queryset(self):
        qs = GameTicket.objects.select_related("user", "reviewer").prefetch_related("genres", "platforms").all().order_by("-created_at")

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


@extend_schema(
    tags=["Game tickets – Admin"],
    summary="Updater les metadata d'un ticket",
    description=(
        "Permet à un utilisateur **staff** de mettre à jour les metadata internes "
        "d'un ticket (commentaires, notes, metadata JSON).\n\n"
        "**Important :** Cette endpoint ne modifie **pas** le statut du ticket. "
        "Utilisez les endpoints de workflow (approve, reject, etc.) pour ça.\n\n"
        "### Champs modifiables\n"
        "- `internal_comment` : Commentaire interne\n"
        "- `internal_note` : Note interne\n"
        "- `admin_metadata` : Données JSON arbitraires\n"
    ),
    request=AdminGameTicketUpdateSerializer,
    responses={
        200: AdminGameTicketListSerializer,
        400: OpenApiResponse(description="Données invalides"),
        403: OpenApiResponse(description="Permission refusée"),
        404: OpenApiResponse(description="Ticket introuvable"),
    },
)
class AdminGameTicketUpdateView(UpdateAPIView):
    queryset = GameTicket.objects.all()
    serializer_class = AdminGameTicketUpdateSerializer
    permission_classes = [IsAdminWithPermission]
    required_permission = TicketPermission.CHANGE_DATA

    def patch(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_update(self, serializer):
        ticket = serializer.save()

        log_admin_action(
            admin_user=self.request.user,
            action_type="ticket.update_internal",
            target_type="game_ticket",
            target_id=ticket.pk,
            description="Modification des données internes du ticket via API",
        )


@extend_schema_view(
    get=extend_schema(
        tags=["Game tickets – Admin"],
        summary="Voir l'historique d'un ticket",
        description=("Retourne l'historique des changements d'états d'un ticket donné."),
    )
)
class AdminGameTicketHistoryView(ListAPIView):
    serializer_class = GameTicketHistorySerializer
    permission_classes = [CanReadTicket]

    def get_queryset(self):
        ticket_id = self.kwargs.get("pk")
        return GameTicketHistory.objects.filter(ticket_id=ticket_id).select_related("actor").order_by("-created_at")


@extend_schema_view(
    get=extend_schema(
        tags=["Game tickets – Admin"],
        summary="Voir les commentaires d'un ticket",
        description=("Retourne les commentaires liés à un ticket donné."),
    ),
    post=extend_schema(
        tags=["Game tickets – Admin"],
        summary="Ajouter un commentaire à un ticket",
        description=("Permet à un admin de poster un nouveau commentaire sur un ticket."),
        request=GameTicketCommentSerializer,
        responses={201: GameTicketCommentSerializer},
    ),
)
class AdminGameTicketCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = GameTicketCommentSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [CanReadTicket()]
        return [IsAdminWithPermission()]

    @property
    def required_permission(self):
        if self.request.method == "GET":
            return "ticket_read"
        return "ticket.change_data"

    def get_queryset(self):
        ticket_id = self.kwargs.get("pk")
        return GameTicketComment.objects.filter(ticket_id=ticket_id).select_related("author").order_by("-created_at")

    def perform_create(self, serializer):
        ticket = generics.get_object_or_404(GameTicket, pk=self.kwargs.get("pk"))
        serializer.save(ticket=ticket, author=self.request.user)

        log_admin_action(
            admin_user=self.request.user,
            action_type="ticket.add_comment",
            target_type="game_ticket",
            target_id=ticket.pk,
            description="Ajout d'un commentaire sur le ticket via API",
        )
