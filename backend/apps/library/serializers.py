from rest_framework import serializers

from .models import UserGame


class UserGameSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGame
        fields = [
            "id",
            "igdb_game_id",
            "status",
            "hours_played",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]