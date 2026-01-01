from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers

from .errors import UserErrors
from .models import CustomUser as User


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
        return user


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)
    avatar_url = serializers.SerializerMethodField()

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
            "description_courte",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "email"]

    def get_avatar_url(self, obj):
        """Retourne l'URL absolue de l'avatar si présent"""
        if obj.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.avatar.url)
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

    def update(self, instance, validated_data):
        """Supprime l'ancien avatar lors du remplacement"""
        new_avatar = validated_data.get("avatar", serializers.empty)
        if new_avatar is not serializers.empty:
            if instance.avatar:
                if new_avatar is None or instance.avatar != new_avatar:
                    instance.avatar.delete(save=False)
        return super().update(instance, validated_data)

    def validate_pseudo(self, value):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request is not None else None

        if user is not None and User.objects.exclude(pk=user.pk).filter(pseudo=value).exists():
            raise serializers.ValidationError(UserErrors.PSEUDO_ALREADY_EXISTS)
        return value
