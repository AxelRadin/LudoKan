from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    # first_name / last_name sont optionnels dans le modèle, on les rend donc optionnels ici
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    pseudo = serializers.CharField(required=True)
    description_courte = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "pseudo",
            "email",
            "password",
            "description_courte",
        ]

    # ---------- VALIDATIONS ----------
    def validate_email(self, value):
        validate_email(value)

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")

        return value

    def validate_pseudo(self, value):
        if User.objects.filter(pseudo=value).exists():
            raise serializers.ValidationError("Ce pseudo est déjà utilisé.")
        return value

    def validate_password(self, value):
        # Utilise la validation Django (taille, chiffres, etc.)
        validate_password(value)
        return value

    # ---------- CREATION UTILISATEUR ----------
    def create(self, validated_data):
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "pseudo"]
