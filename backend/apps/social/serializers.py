from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.social.models import FriendRequest
from apps.social.utils import friends_count

User = get_user_model()


class FriendMiniSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "pseudo", "avatar_url"]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None


class FriendRequestSerializer(serializers.ModelSerializer):
    from_user = FriendMiniSerializer(read_only=True)
    to_user = FriendMiniSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "from_user", "to_user", "status", "created_at", "updated_at"]
        read_only_fields = fields


class FriendRequestCreateSerializer(serializers.Serializer):
    to_user_id = serializers.IntegerField(required=False)
    to_pseudo = serializers.CharField(required=False, max_length=150, allow_blank=False)

    def validate(self, attrs):
        tid = attrs.get("to_user_id")
        pseudo = (attrs.get("to_pseudo") or "").strip()
        if tid is None and not pseudo:
            raise serializers.ValidationError("Indique to_user_id ou to_pseudo.")
        if tid is not None and pseudo:
            raise serializers.ValidationError("Utilise soit to_user_id soit to_pseudo.")
        return attrs

    def resolve_to_user(self):
        tid = self.validated_data.get("to_user_id")
        pseudo = (self.validated_data.get("to_pseudo") or "").strip()
        if tid is not None:
            return User.objects.filter(pk=tid).first()
        return User.objects.filter(pseudo__iexact=pseudo).first()


class FriendshipFriendSerializer(serializers.ModelSerializer):
    """Utilisateur ami (l’autre que request.user)."""

    avatar_url = serializers.SerializerMethodField()
    friends_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "pseudo", "avatar_url", "friends_count"]

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_friends_count(self, obj) -> int:
        return friends_count(obj)


class BlockUserCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    pseudo = serializers.CharField(required=False, max_length=150, allow_blank=False)

    def validate(self, attrs):
        uid = attrs.get("user_id")
        pseudo = (attrs.get("pseudo") or "").strip()
        if uid is None and not pseudo:
            raise serializers.ValidationError("Indique user_id ou pseudo.")
        if uid is not None and pseudo:
            raise serializers.ValidationError("Utilise soit user_id soit pseudo.")
        return attrs

    def resolve_blocked_user(self):
        uid = self.validated_data.get("user_id")
        pseudo = (self.validated_data.get("pseudo") or "").strip()
        if uid is not None:
            return User.objects.filter(pk=uid).first()
        return User.objects.filter(pseudo__iexact=pseudo).first()
