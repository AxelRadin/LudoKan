from rest_framework import serializers

from apps.games.models import Game
from apps.parties.models import GameParty, GamePartyMember

PARTY_READ_FIELDS = (
    "id",
    "status",
    "game",
    "max_players",
    "chat_room_id",
    "open_deadline_at",
    "ready_deadline_at",
    "ready_for_chat_deadline_at",
    "countdown_started_at",
    "countdown_ends_at",
    "members",
)


class PartyMemberReadSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    pseudo = serializers.CharField(read_only=True, source="user.pseudo")

    class Meta:
        model = GamePartyMember
        fields = (
            "user_id",
            "pseudo",
            "membership_status",
            "ready_state",
            "ready_for_chat_state",
            "joined_at",
            "left_at",
        )


class PartyReadSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    chat_room_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = GameParty
        fields = PARTY_READ_FIELDS
        read_only_fields = PARTY_READ_FIELDS

    def get_members(self, obj: GameParty) -> list:
        members = list(obj.members.all())
        return PartyMemberReadSerializer(members, many=True).data


class PartyJoinOrCreateSerializer(serializers.Serializer):
    game = serializers.PrimaryKeyRelatedField(queryset=Game.objects.all())
    max_players = serializers.IntegerField(required=False, allow_null=True, min_value=1)


class PartyAcceptanceSerializer(serializers.Serializer):
    accepted = serializers.BooleanField(default=True)
