from __future__ import annotations

from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.parties.constants import NON_TERMINAL_PARTY_STATUS_VALUES
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.permissions import IsPartyFlowMember
from apps.parties.serializers import (
    PartyAcceptanceSerializer,
    PartyJoinOrCreateSerializer,
    PartyReadSerializer,
)
from apps.parties.services.chat_bootstrap import open_chat_if_eligible
from apps.parties.services.lifecycle import leave_party, mark_ready, mark_ready_for_chat
from apps.parties.services.recruitment import join_or_create_party


def _party_queryset_for_read() -> QuerySet[GameParty]:
    member_qs = GamePartyMember.objects.select_related("user").order_by("joined_at")
    prefetch = Prefetch("members", queryset=member_qs)
    return GameParty.objects.select_related("game", "chat_room").prefetch_related(prefetch)


def _get_party_for_read(party_id: int) -> GameParty:
    return get_object_or_404(_party_queryset_for_read(), pk=party_id)


def _maybe_lazy_open_chat(*, party_id: int) -> None:
    row = GameParty.objects.only("id", "status", "countdown_ends_at").filter(pk=party_id).first()
    if row is None:
        return
    if row.status != GameParty.Status.COUNTDOWN:
        return
    if row.countdown_ends_at is None or row.countdown_ends_at > timezone.now():
        return
    open_chat_if_eligible(party_id)


def _serialize_party_after_lazy_chat(party_id: int) -> dict:
    _maybe_lazy_open_chat(party_id=party_id)
    party = _get_party_for_read(party_id)
    return PartyReadSerializer(party).data


def _response_party_read_lazy(party_id: int) -> Response:
    return Response(_serialize_party_after_lazy_chat(party_id), status=status.HTTP_200_OK)


def _get_active_party_for_user(user) -> GameParty | None:
    membership = (
        GamePartyMember.objects.filter(
            user=user,
            membership_status=GamePartyMember.MembershipStatus.ACTIVE,
            left_at__isnull=True,
            party__status__in=NON_TERMINAL_PARTY_STATUS_VALUES,
        )
        .select_related("party")
        .order_by("-party__updated_at", "-party__id")
        .first()
    )
    if membership is None:
        return None
    return membership.party


@extend_schema(tags=["Parties"])
class PartyJoinOrCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Rejoindre ou créer une party",
        request=PartyJoinOrCreateSerializer,
        responses={200: PartyReadSerializer},
    )
    def post(self, request):
        ser = PartyJoinOrCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        game = ser.validated_data["game"]
        max_players_override = ser.validated_data.get("max_players")
        party = join_or_create_party(
            request.user,
            game,
            max_players_override=max_players_override,
        )
        data = PartyReadSerializer(_get_party_for_read(party.id)).data
        return Response(data, status=status.HTTP_200_OK)


@extend_schema(tags=["Parties"])
class PartyMeActiveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Party active de l'utilisateur connecté",
        responses={200: PartyReadSerializer, 404: OpenApiResponse(description="Aucune party active")},
    )
    def get(self, request):
        party = _get_active_party_for_user(request.user)
        if party is None:
            return Response({"detail": "No active party."}, status=status.HTTP_404_NOT_FOUND)
        return _response_party_read_lazy(party.id)


@extend_schema(tags=["Parties"])
class PartyDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPartyFlowMember]

    @extend_schema(
        summary="Détail d'une party",
        responses={200: PartyReadSerializer, 403: OpenApiResponse(description="Non membre")},
    )
    def get(self, request, party_id: int):
        party = get_object_or_404(GameParty, pk=party_id)
        self.check_object_permissions(request, party)
        return _response_party_read_lazy(party_id)


@extend_schema(tags=["Parties"])
class PartyReadyView(APIView):
    permission_classes = [IsAuthenticated, IsPartyFlowMember]

    @extend_schema(
        summary="Indiquer prêt (phase waiting_ready)",
        request=PartyAcceptanceSerializer,
        responses={200: PartyReadSerializer, 400: OpenApiResponse(description="Erreur métier")},
    )
    def post(self, request, party_id: int):
        party = get_object_or_404(GameParty, pk=party_id)
        self.check_object_permissions(request, party)
        body = PartyAcceptanceSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        accepted = body.validated_data["accepted"]
        try:
            mark_ready(party_id=party_id, user=request.user, accepted=accepted)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return _response_party_read_lazy(party_id)


@extend_schema(tags=["Parties"])
class PartyReadyForChatView(APIView):
    permission_classes = [IsAuthenticated, IsPartyFlowMember]

    @extend_schema(
        summary="Indiquer prêt pour le chat",
        request=PartyAcceptanceSerializer,
        responses={200: PartyReadSerializer, 400: OpenApiResponse(description="Erreur métier")},
    )
    def post(self, request, party_id: int):
        party = get_object_or_404(GameParty, pk=party_id)
        self.check_object_permissions(request, party)
        body = PartyAcceptanceSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        accepted = body.validated_data["accepted"]
        try:
            mark_ready_for_chat(party_id=party_id, user=request.user, accepted=accepted)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return _response_party_read_lazy(party_id)


@extend_schema(tags=["Parties"])
class PartyLeaveView(APIView):
    permission_classes = [IsAuthenticated, IsPartyFlowMember]

    @extend_schema(
        summary="Quitter la party",
        responses={200: PartyReadSerializer},
    )
    def post(self, request, party_id: int):
        party = get_object_or_404(GameParty, pk=party_id)
        self.check_object_permissions(request, party)
        leave_party(party_id=party_id, user=request.user)
        return _response_party_read_lazy(party_id)
