from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.chat.models import ChatRoom, ChatRoomUser
from apps.matchmaking.models import GameParty, GamePartyMember, MatchmakingRequest
from apps.matchmaking.permissions import IsOwnerOrAdmin
from apps.matchmaking.serializers import MatchmakingRequestSerializer, MatchResultSerializer, PartyInfoSerializer
from apps.matchmaking.utils import find_matches, join_or_create_party


class MatchmakingRequestViewSet(ModelViewSet):
    serializer_class = MatchmakingRequestSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        qs = MatchmakingRequest.objects.all()
        MatchmakingRequest.objects.expire_old()

        if self.action == "list":
            qs = qs.filter(status=MatchmakingRequest.STATUS_PENDING, expires_at__gt=timezone.now())
            game = self.request.query_params.get("game")
            if game:
                qs = qs.filter(game_id=game)

        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        instance = serializer.save()
        join_or_create_party(self.request.user, instance.game)

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
        user_request = (
            MatchmakingRequest.objects.filter(user=request.user, status=MatchmakingRequest.STATUS_PENDING, expires_at__gt=timezone.now())
            .order_by("-created_at")
            .first()
        )

        if not user_request:
            return Response({"detail": "Aucune demande de matchmaking active."}, status=status.HTTP_404_NOT_FOUND)

        matches_with_distance = find_matches(user_request)
        matches = [req for req, _ in matches_with_distance]
        distances = {req.id: distance for req, distance in matches_with_distance}
        matches.sort(key=lambda r: distances[r.id])

        serializer = MatchResultSerializer(matches, many=True, context={"distances": distances})
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# VUE : LOBBY / PARTY
# ==========================================


class GamePartyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="my-active")
    def my_active(self, request):
        member = GamePartyMember.objects.filter(user=request.user).order_by("-joined_at").first()

        if not member or member.party.status == GameParty.STATUS_CANCELLED:
            return Response({})

        party = member.party

        if party.status == GameParty.STATUS_COUNTDOWN and party.countdown_ends_at and party.countdown_ends_at <= timezone.now():
            self._activate_chat(party)

        serializer = PartyInfoSerializer(party, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def ready(self, request, pk=None):
        member = get_object_or_404(GamePartyMember, party_id=pk, user=request.user)
        member.ready = True
        member.save()
        return Response({"status": "ready"})

    @action(detail=True, methods=["post"], url_path="ready-for-chat")
    def ready_for_chat(self, request, pk=None):
        member = get_object_or_404(GamePartyMember, party_id=pk, user=request.user)
        member.ready_for_chat = True
        member.save()

        party = member.party
        if not party.members.filter(ready_for_chat=False).exists():
            party.status = GameParty.STATUS_COUNTDOWN
            party.countdown_ends_at = timezone.now() + timedelta(seconds=5)
            party.save()

        return Response({"status": "ready_for_chat"})

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        party = get_object_or_404(GameParty, pk=pk)

        GamePartyMember.objects.filter(party=party, user=request.user).delete()

        remaining = party.members.count()

        if remaining == 0:
            party.status = GameParty.STATUS_CANCELLED
            party.save()
        elif remaining == 1 and party.status == GameParty.STATUS_CHAT_ACTIVE:
            party.countdown_ends_at = timezone.now() + timedelta(seconds=60)
            party.save()

        return Response({"status": "left"})

    def _activate_chat(self, party):
        """Crée la ChatRoom en base et ouvre le canal."""

        chat_room = ChatRoom.objects.create(type="group")

        for member in party.members.all():
            ChatRoomUser.objects.create(room=chat_room, user=member.user)

        party.status = GameParty.STATUS_CHAT_ACTIVE
        party.chat_room_id = str(chat_room.id)
        party.save()
