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

    def custom_signup(self, request, user):
        user.pseudo = self.validated_data.get('pseudo', user.pseudo)
        user.first_name = self.validated_data.get('first_name', '')
        user.last_name = self.validated_data.get('last_name', '')
        user.description_courte = self.validated_data.get('description_courte', '')
        user.save()


class UserSerializer(serializers.ModelSerializer):
    print("WE are in the Serializer of UserSerializer")
    class Meta:
        model = User
        fields = [
            "id", "email", "pseudo", "first_name", "last_name",
            "avatar_url", "description_courte", "created_at"
        ]
        read_only_fields = ["id", "created_at", "email"]

    def validate_pseudo(self, value):
        print("WE are in the validate_pseudo of the serializer UserSerializer")
        user = self.context.get('request').user
        if User.objects.exclude(pk=user.pk).filter(pseudo=value).exists():
            raise serializers.ValidationError("Ce pseudo est déjà utilisé.")
        return value