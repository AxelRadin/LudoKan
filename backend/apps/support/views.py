from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminWithPermission, IsNotSuspended
from apps.users.utils import log_admin_action

from .models import SupportTicket
from .serializers import (
    SupportTicketAdminListSerializer,
    SupportTicketAdminUpdateSerializer,
    SupportTicketCreateSerializer,
    SupportTicketUserDetailSerializer,
    SupportTicketUserListSerializer,
)


class UserSupportTicketListCreateView(generics.ListCreateAPIView):
    """
    GET /api/support/tickets/ — tickets de l'utilisateur connecté.
    POST /api/support/tickets/ — créer un ticket.
    """

    permission_classes = [IsAuthenticated, IsNotSuspended]
    pagination_class = None

    def get_queryset(self):
        return SupportTicket.objects.filter(user=self.request.user).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SupportTicketCreateSerializer
        return SupportTicketUserListSerializer


class UserSupportTicketDetailView(generics.RetrieveAPIView):
    """GET /api/support/tickets/<id>/ — détail si propriétaire."""

    permission_classes = [IsAuthenticated, IsNotSuspended]
    serializer_class = SupportTicketUserDetailSerializer

    def get_queryset(self):
        return SupportTicket.objects.filter(user=self.request.user)


class CanViewSupport(IsAdminWithPermission):
    required_permission = "support.view"


class CanManageSupport(IsAdminWithPermission):
    required_permission = "support.manage"


class AdminSupportTicketListView(generics.ListAPIView):
    """GET /api/admin/support/tickets/"""

    permission_classes = [CanViewSupport]
    serializer_class = SupportTicketAdminListSerializer

    def get_queryset(self):
        qs = SupportTicket.objects.select_related("user", "assigned_to").order_by("-created_at")
        st = self.request.query_params.get("status")
        cat = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        if st:
            qs = qs.filter(status=st)
        if cat:
            qs = qs.filter(category=cat)
        if search and search.strip():
            q = search.strip()
            qs = qs.filter(Q(subject__icontains=q) | Q(body__icontains=q) | Q(user__email__icontains=q) | Q(user__pseudo__icontains=q))
        return qs


class AdminSupportTicketDetailView(APIView):
    """GET / PATCH /api/admin/support/tickets/<id>/"""

    def get_permissions(self):
        if self.request.method == "GET":
            return [CanViewSupport()]
        if self.request.method == "PATCH":
            return [CanManageSupport()]
        return [IsAuthenticated()]

    def get(self, request, pk: int):
        ticket = get_object_or_404(
            SupportTicket.objects.select_related("user", "assigned_to"),
            pk=pk,
        )
        return Response(SupportTicketAdminListSerializer(ticket).data)

    def patch(self, request, pk: int):
        ticket = get_object_or_404(SupportTicket, pk=pk)
        serializer = SupportTicketAdminUpdateSerializer(ticket, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        ticket.refresh_from_db()
        log_admin_action(
            admin_user=request.user,
            action_type="support.ticket.update",
            target_type="support_ticket",
            target_id=ticket.pk,
            description=f"Statut={ticket.status}",
        )
        return Response(SupportTicketAdminListSerializer(ticket).data, status=status.HTTP_200_OK)
