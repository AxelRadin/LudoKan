from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers

from apps.core.tasks import send_welcome_email

from .errors import UserErrors
from .models import AdminAction
from .models import CustomUser as User
from .models import UserRole, UserSuspension


class CustomRegisterSerializer(RegisterSerializer):
    pseudo = serializers.CharField(required=False, max_length=150)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    description_courte = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        """
        Valide l'unicité de l'email avec un message d'erreur explicite.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(UserErrors.EMAIL_ALREADY_EXISTS)
        return super().validate_email(value)

    def validate_pseudo(self, value):
        if value and User.objects.filter(pseudo=value).exists():
            raise serializers.ValidationError(UserErrors.PSEUDO_ALREADY_EXISTS)
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data["pseudo"] = self.validated_data.get("pseudo", "")
        data["first_name"] = self.validated_data.get("first_name", "")
        data["last_name"] = self.validated_data.get("last_name", "")
        data["description_courte"] = self.validated_data.get("description_courte", "")
        return data

    def validate_password1(self, value):
        if len(value) < 8:
            raise serializers.ValidationError(UserErrors.PASSWORD_TOO_SHORT)

        password2 = self.initial_data.get("password2") if hasattr(self, "initial_data") else None
        if password2 is not None and value != password2:
            raise serializers.ValidationError(UserErrors.PASSWORD_MISMATCH)

        return value

    def save(self, request):
        """Override save to use the custom user manager"""
        user = User.objects.create_user(
            email=self.validated_data.get("email"),
            password=self.validated_data.get("password1"),
            pseudo=self.validated_data.get("pseudo", None),  # None pour déclencher la génération auto
            first_name=self.validated_data.get("first_name", ""),
            last_name=self.validated_data.get("last_name", ""),
            description_courte=self.validated_data.get("description_courte", ""),
        )
        send_welcome_email.delay(user.email, user.pseudo or user.email.split("@", 1)[0])
        return user


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField()
    banner = serializers.ImageField(required=False, allow_null=True)
    banner_url = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    steam_id = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "pseudo",
            "first_name",
            "last_name",
            "avatar",
            "avatar_url",
            "banner",
            "banner_url",
            "description_courte",
            "created_at",
            "review_count",
            "steam_id",
            "roles",
            "is_superuser",
        ]
        read_only_fields = ["id", "created_at", "email", "steam_id", "roles", "is_superuser"]
        
    def validate_email(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None

        if user is not None and User.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError(UserErrors.EMAIL_ALREADY_EXISTS)
        elif user is None and User.objects.filter(email=value).exists():
            raise serializers.ValidationError(UserErrors.EMAIL_ALREADY_EXISTS)

        return value

    def get_roles(self, obj) -> list[str]:
        return list(UserRole.objects.filter(user=obj).values_list("role", flat=True))

    def get_steam_id(self, obj):
        if hasattr(obj, "steam_profile"):
            return obj.steam_profile.steam_id
        return None

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_avatar_url(self, obj):
        """Retourne l'URL absolue de l'avatar si présent"""
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_banner_url(self, obj):
        """Retourne l'URL absolue de la bannière si présente"""
        if obj.banner:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.banner.url)
        return None

    def validate_avatar(self, value):
        """Valide le fichier avatar uploadé"""
        if value:
            # Taille max: 2 Mo
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError(UserErrors.AVATAR_TOO_LARGE)

            # Formats supportés
            valid_extensions = ["jpg", "jpeg", "png", "webp"]
            ext = value.name.split(".")[-1].lower()
            if ext not in valid_extensions:
                raise serializers.ValidationError(UserErrors.AVATAR_INVALID_FORMAT)
        return value

    def validate_banner(self, value):
        """Valide le fichier bannière uploadé"""
        if value:
            # Taille max: 5 Mo (laisser un peu plus grand pour la bannière)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("La bannière ne doit pas dépasser 5 Mo.")

            # Formats supportés
            valid_extensions = ["jpg", "jpeg", "png", "webp"]
            ext = value.name.split(".")[-1].lower()
            if ext not in valid_extensions:
                raise serializers.ValidationError("Format de bannière invalide.")
        return value

    def update(self, instance, validated_data):
        """Supprime l'ancien avatar/bannière lors du remplacement"""
        new_avatar = validated_data.get("avatar", serializers.empty)
        if new_avatar is not serializers.empty and instance.avatar and (new_avatar is None or instance.avatar != new_avatar):
            instance.avatar.delete(save=False)

        new_banner = validated_data.get("banner", serializers.empty)
        if new_banner is not serializers.empty and instance.banner and (new_banner is None or instance.banner != new_banner):
            instance.banner.delete(save=False)

        return super().update(instance, validated_data)

    def validate_pseudo(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None

        if user is not None and User.objects.exclude(pk=user.pk).filter(pseudo=value).exists():
            raise serializers.ValidationError(UserErrors.PSEUDO_ALREADY_EXISTS)  # pragma: no cover
        return value


class UserSuspensionSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserSuspension
        fields = [
            "id",
            "user",
            "suspended_by",
            "reason",
            "start_date",
            "end_date",
            "is_active",
            "is_expired",
            "created_at",
        ]


class UserSuspendSerializer(serializers.Serializer):
    """
    Payload pour la suspension d'un utilisateur.

    - reason : obligatoire, message libre.
    - end_date : optionnelle, date de fin de suspension.
    """

    reason = serializers.CharField()
    end_date = serializers.DateTimeField(required=False, allow_null=True)


class AdminUserListSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(many=True, read_only=True, slug_field="role")

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "pseudo",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "created_at",
            "roles",
        ]
        read_only_fields = fields


class AdminActionSerializer(serializers.ModelSerializer):
    admin_user_email = serializers.EmailField(source="admin_user.email", read_only=True)
    admin_user_pseudo = serializers.CharField(source="admin_user.pseudo", read_only=True)

    class Meta:
        model = AdminAction
        fields = [
            "id",
            "timestamp",
            "admin_user",
            "admin_user_email",
            "admin_user_pseudo",
            "action_type",
            "target_type",
            "target_id",
            "description",
        ]
        read_only_fields = fields
