from dj_rest_auth.registration.serializers import RegisterSerializer
from rest_framework import serializers
from .models import CustomUser as User

class CustomRegisterSerializer(RegisterSerializer):
    pseudo = serializers.CharField(required=False, max_length=150)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    description_courte = serializers.CharField(required=False, allow_blank=True)

    def validate_pseudo(self, value):
        if value and User.objects.filter(pseudo=value).exists():
            raise serializers.ValidationError("Ce pseudo est déjà utilisé.")
        return value

    def get_cleaned_data(self):
        data = super().get_cleaned_data()
        data['pseudo'] = self.validated_data.get('pseudo', '')
        data['first_name'] = self.validated_data.get('first_name', '')
        data['last_name'] = self.validated_data.get('last_name', '')
        data['description_courte'] = self.validated_data.get('description_courte', '')
        return data

    def validate_password1(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 8 caractères.")

        password2 = self.initial_data.get('password2') if hasattr(self, 'initial_data') else None
        if password2 is not None and value != password2:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")

        return value
    
    def save(self, request):
        """Override save to use the custom user manager"""
        user = User.objects.create_user(
            email=self.validated_data.get('email'),
            password=self.validated_data.get('password1'),
            pseudo=self.validated_data.get('pseudo', None),  # None pour déclencher la génération auto
            first_name=self.validated_data.get('first_name', ''),
            last_name=self.validated_data.get('last_name', ''),
            description_courte=self.validated_data.get('description_courte', '')
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    print("WE are in the Serializer of UserSerializer")
    class Meta:
        model = User
        fields = [
            "id", "email", "pseudo", "first_name", "last_name",
            "avatar", "avatar_url", "description_courte", "created_at"
        ]
        read_only_fields = ["id", "created_at", "email"]

    def validate_pseudo(self, value):
        print("WE are in the validate_pseudo of the serializer UserSerializer")
        user = self.context.get('request').user
        if User.objects.exclude(pk=user.pk).filter(pseudo=value).exists():
            raise serializers.ValidationError("Ce pseudo est déjà utilisé.")
        return value