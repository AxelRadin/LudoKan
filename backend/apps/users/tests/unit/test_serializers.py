"""
Tests pour les serializers de l'app users
"""

from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.users.errors import UserErrors
from apps.users.serializers import CustomRegisterSerializer, UserSerializer

User = get_user_model()


@pytest.mark.django_db
class TestCustomRegisterSerializer:
    """Tests pour le serializer d'inscription CustomRegisterSerializer"""

    @pytest.fixture(autouse=True)
    def welcome_email_delay_mock(self, monkeypatch):
        mock_delay = mock.Mock(return_value=mock.Mock(id="task-id"))
        fake_task = mock.Mock()
        fake_task.delay = mock_delay
        monkeypatch.setattr("apps.users.serializers.send_welcome_email", fake_task)
        yield mock_delay

    def test_valid_registration_data_creates_user(self, welcome_email_delay_mock):
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
        welcome_email_delay_mock.assert_called_once_with(data["email"], data["pseudo"])

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

    def test_pseudo_generated_when_not_provided(self, welcome_email_delay_mock):
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
        welcome_email_delay_mock.assert_called_once_with(data["email"], user.pseudo)

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

    def test_banner_too_large_validation_error(self, user):
        large_file = self._make_image_file("banner.png", size_bytes=6 * 1024 * 1024)  # 6 Mo
        serializer = UserSerializer(instance=user)
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError) as exc:
            serializer.validate_banner(large_file)
        assert "La bannière ne doit pas dépasser 5 Mo." in str(exc.value)

    def test_banner_invalid_extension_validation_error(self, user):
        invalid_file = self._make_image_file("banner.bmp", size_bytes=1000)
        serializer = UserSerializer(instance=user)
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError) as exc:
            serializer.validate_banner(invalid_file)
        assert "Format de bannière invalide" in str(exc.value)

    def test_get_banner_url_with_request(self, user, rf):
        banner_file = self._make_image_file("banner.png", size_bytes=100)
        user.banner = banner_file
        user.save()

        request = rf.get("/")
        serializer = UserSerializer(instance=user, context={"request": request})
        assert serializer.data["banner_url"] == request.build_absolute_uri(user.banner.url)

    def test_update_removes_old_banner(self, user):
        old_banner = self._make_image_file("old_banner.png", size_bytes=100)
        user.banner = old_banner
        user.save()

        serializer = UserSerializer(instance=user, data={"banner": None}, partial=True)
        assert serializer.is_valid()
        updated_user = serializer.save()
        assert not updated_user.banner

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

    def test_get_steam_id_with_profile(self, user):
        from apps.users.models import SteamProfile

        SteamProfile.objects.create(user=user, steam_id="123456789")
        serializer = UserSerializer(instance=user)
        assert serializer.data["steam_id"] == "123456789"

    def test_get_steam_id_without_profile(self, user):
        serializer = UserSerializer(instance=user)
        assert serializer.data.get("steam_id") is None

    def test_validate_email_conflict_raises_error(self, user, another_user, rf):
        """Un email déjà utilisé par un autre user doit lever une erreur."""
        request = rf.get("/api/auth/user/")
        request.user = user

        serializer = UserSerializer(instance=user, context={"request": request})
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError):
            serializer.validate_email(another_user.email)

    def test_validate_email_without_request_raises_for_existing_email(self, user):
        """Sans contexte request, un email déjà utilisé doit lever une erreur (branche elif)."""
        serializer = UserSerializer(instance=user)
        from rest_framework.exceptions import ValidationError

        with pytest.raises(ValidationError):
            serializer.validate_email(user.email)

    @pytest.mark.django_db
    def test_roles_empty_for_regular_user(self, user):
        serializer = UserSerializer(instance=user)
        assert serializer.data["roles"] == []

    @pytest.mark.django_db
    def test_roles_returns_assigned_roles(self, user):
        from apps.users.models import UserRole

        UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
        serializer = UserSerializer(instance=user)
        assert "admin" in serializer.data["roles"]

    @pytest.mark.django_db
    def test_is_superuser_false_for_regular_user(self, user):
        serializer = UserSerializer(instance=user)
        assert serializer.data["is_superuser"] is False

    @pytest.mark.django_db
    def test_is_superuser_true_for_superuser(self, user):
        user.is_superuser = True
        user.save()
        serializer = UserSerializer(instance=user)
        assert serializer.data["is_superuser"] is True
