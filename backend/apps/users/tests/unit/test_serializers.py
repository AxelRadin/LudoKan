"""
Tests pour les serializers de l'app users
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.users.errors import UserErrors
from apps.users.serializers import CustomRegisterSerializer, UserSerializer

User = get_user_model()


@pytest.mark.django_db
class TestCustomRegisterSerializer:
    """Tests pour le serializer d'inscription CustomRegisterSerializer"""

    def test_valid_registration_data_creates_user(self):
        data = {
            "email": "newuser@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
            "pseudo": "newuser",
            "first_name": "John",
            "last_name": "Doe",
            "description_courte": "Short bio",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        user = serializer.save(request=None)
        assert user.email == data["email"]
        assert user.pseudo == data["pseudo"]
        assert user.first_name == data["first_name"]
        assert user.last_name == data["last_name"]
        assert user.description_courte == data["description_courte"]
        assert user.check_password(data["password1"])

    def test_email_already_exists_raises_error(self, user):
        data = {
            "email": user.email,  # déjà utilisé
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
            "pseudo": "anotheruser",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "email" in serializer.errors
        assert UserErrors.EMAIL_ALREADY_EXISTS in serializer.errors["email"]

    def test_pseudo_already_exists_raises_error(self, user):
        data = {
            "email": "other@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
            "pseudo": user.pseudo,  # déjà utilisé
        }

        serializer = CustomRegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "pseudo" in serializer.errors
        assert UserErrors.PSEUDO_ALREADY_EXISTS in serializer.errors["pseudo"]

    def test_password_too_short_raises_error(self):
        data = {
            "email": "short@example.com",
            "password1": "1234567",  # 7 chars
            "password2": "1234567",
            "pseudo": "shortuser",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "password1" in serializer.errors
        assert UserErrors.PASSWORD_TOO_SHORT in serializer.errors["password1"]

    def test_password_mismatch_raises_error(self):
        data = {
            "email": "mismatch@example.com",
            "password1": "StrongPass123!",
            "password2": "OtherPass123!",
            "pseudo": "mismatchuser",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert not serializer.is_valid()
        assert "password1" in serializer.errors
        assert UserErrors.PASSWORD_MISMATCH in serializer.errors["password1"]

    def test_pseudo_generated_when_not_provided(self):
        data = {
            "email": "auto@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        user = serializer.save(request=None)
        # Le manager CustomUserManager génère un pseudo basé sur l'email
        assert user.pseudo is not None
        assert user.pseudo != ""

    def test_get_cleaned_data_includes_extra_fields(self):
        data = {
            "email": "clean@example.com",
            "password1": "StrongPass123!",
            "password2": "StrongPass123!",
            "pseudo": "cleanuser",
            "first_name": "John",
            "last_name": "Doe",
            "description_courte": "Short bio",
        }

        serializer = CustomRegisterSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

        # Simuler l'étape où cleaned_data est utilisé
        serializer._validated_data = serializer.validated_data
        cleaned = serializer.get_cleaned_data()

        assert cleaned["pseudo"] == "cleanuser"
        assert cleaned["first_name"] == "John"
        assert cleaned["last_name"] == "Doe"
        assert cleaned["description_courte"] == "Short bio"


@pytest.mark.django_db
class TestUserSerializer:
    """Tests unitaires pour UserSerializer"""

    def _make_image_file(self, name: str, size_bytes: int) -> SimpleUploadedFile:
        """Crée un fichier 'image' factice de la taille voulue."""
        content = b"\x00" * size_bytes
        return SimpleUploadedFile(name=name, content=content, content_type="image/png")

    def test_avatar_too_large_validation_error(self, user):
        large_file = self._make_image_file("avatar.png", size_bytes=3 * 1024 * 1024)  # 3 Mo

        serializer = UserSerializer(instance=user, data={"avatar": large_file}, partial=True)
        assert not serializer.is_valid()
        # On vérifie au minimum que le champ avatar est en erreur
        assert "avatar" in serializer.errors
        assert serializer.errors["avatar"]

    def test_avatar_invalid_extension_validation_error(self, user):
        invalid_file = self._make_image_file("avatar.bmp", size_bytes=1000)

        serializer = UserSerializer(instance=user, data={"avatar": invalid_file}, partial=True)
        assert not serializer.is_valid()
        # On vérifie au minimum que le champ avatar est en erreur
        assert "avatar" in serializer.errors
        assert serializer.errors["avatar"]

    def test_validate_pseudo_conflict_raises_error(self, user, another_user, rf):
        """Un pseudo déjà utilisé par un autre user doit lever une erreur."""
        request = rf.get("/api/auth/user/")
        request.user = user

        serializer = UserSerializer(instance=user, data={"pseudo": another_user.pseudo}, context={"request": request}, partial=True)
        assert not serializer.is_valid()
        assert "pseudo" in serializer.errors
        # Selon l'ordre des validateurs, on peut avoir notre message custom
        # ou le message par défaut du validateur unique de Django.
        messages = [str(err) for err in serializer.errors["pseudo"]]
        assert any(UserErrors.PSEUDO_ALREADY_EXISTS in msg or "already exists" in msg for msg in messages)

    def test_validate_pseudo_same_user_is_ok(self, user, rf):
        """Un user peut garder son propre pseudo sans erreur."""
        request = rf.get("/api/auth/user/")
        request.user = user

        serializer = UserSerializer(instance=user, data={"pseudo": user.pseudo}, context={"request": request}, partial=True)
        assert serializer.is_valid(), serializer.errors

    def test_validate_pseudo_without_request_context_is_ok(self, user):
        """validate_pseudo doit fonctionner même sans request dans le contexte."""
        serializer = UserSerializer(instance=user, data={"pseudo": "newpseudo"}, partial=True)
        assert serializer.is_valid(), serializer.errors

    def test_validate_pseudo_method_raises_for_conflict(self, user, another_user, rf):
        """Appel direct de validate_pseudo doit lever une erreur si un autre user a ce pseudo."""
        request = rf.get("/api/auth/user/")
        request.user = user

        serializer = UserSerializer(instance=user, context={"request": request})

        with pytest.raises(Exception) as exc:
            serializer.validate_pseudo(another_user.pseudo)

        assert UserErrors.PSEUDO_ALREADY_EXISTS in str(exc.value)
