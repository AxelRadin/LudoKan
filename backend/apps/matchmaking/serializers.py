from django.utils import timezone
from rest_framework import serializers

from apps.matchmaking.models import GameParty, GamePartyMember, MatchmakingRequest


class MatchmakingRequestSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = MatchmakingRequest
        fields = ["id", "user", "game", "latitude", "longitude", "radius_km", "status", "expires_at", "created_at"]
        read_only_fields = ["status", "created_at"]

    def validate_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("expires_at must be in the future.")
        return value

    def validate_radius_km(self, value):
        if value <= 0:
            raise serializers.ValidationError("radius_km must be positive.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        game = attrs.get("game")

        if self.instance is None:
            exists = MatchmakingRequest.objects.filter(
                user=user,
                game=game,
                status=MatchmakingRequest.STATUS_PENDING,
                expires_at__gt=timezone.now(),
            ).exists()
            if exists:
                raise serializers.ValidationError("You already have an active matchmaking request for this game.")
        return attrs


class MatchResultSerializer(serializers.ModelSerializer):
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = MatchmakingRequest
        fields = ["id", "user", "game", "latitude", "longitude", "radius_km", "distance_km"]
        read_only_fields = fields

    def get_distance_km(self, obj):
        distances = self.context.get("distances", {})
        return round(distances.get(obj.id, 0.0), 3)


# ==========================================
# SÉRIALISEURS : LOBBY / PARTY
# ==========================================


class PartyMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = GamePartyMember
        fields = ["id", "user", "username", "is_me", "ready", "ready_for_chat"]

    def get_is_me(self, obj):
        request = self.context.get("request")
        return obj.user == request.user if request else False


class PartyInfoSerializer(serializers.ModelSerializer):
    members = PartyMemberSerializer(many=True, read_only=True)

    class Meta:
        model = GameParty
        fields = ["id", "status", "countdown_ends_at", "chat_room_id", "members"]
