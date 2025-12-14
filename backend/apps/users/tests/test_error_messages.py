"""
Tests ciblés sur les messages d'erreur et la structure de réponse
pour les endpoints liés aux utilisateurs.
"""

import io

import pytest
from django.contrib.auth import get_user_model
from PIL import Image
from rest_framework import status

from apps.users.errors import UserErrors

User = get_user_model()


def get_errors_payload(response):
    """
    Helper pour récupérer le payload d'erreurs en tenant compte
    du handler custom qui wrappe la réponse dans:
    {
        "success": False,
        "errors": { ... }
    }
    """
    data = getattr(response, "data", {}) or {}
    return data.get("errors", data)


@pytest.mark.django_db
class TestRegistrationErrorMessages:
    def test_register_duplicate_email_uses_french_message(self, api_client, user):
        """Inscription avec email déjà utilisé -> message explicite en français."""
        url = "/api/auth/registration/"
        data = {
            "email": user.email,
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
            "pseudo": "anotherpseudo",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        assert "email" in errors
        assert UserErrors.EMAIL_ALREADY_EXISTS in errors["email"]

    def test_register_duplicate_pseudo_uses_french_message(self, api_client, user):
        """Inscription avec pseudo déjà utilisé -> message explicite en français."""
        url = "/api/auth/registration/"
        data = {
            "email": "newemail@example.com",
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
            "pseudo": user.pseudo,
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        assert "pseudo" in errors
        assert UserErrors.PSEUDO_ALREADY_EXISTS in errors["pseudo"]

    def test_password_too_short_message(self, api_client):
        """Mot de passe trop court -> message PASSWORD_TOO_SHORT."""
        url = "/api/auth/registration/"
        data = {
            "email": "shortpass@example.com",
            "password1": "12345",
            "password2": "12345",
            "pseudo": "shortpassuser",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        assert "password1" in errors
        assert UserErrors.PASSWORD_TOO_SHORT in errors["password1"]

    def test_password_mismatch_message(self, api_client):
        """Mots de passe différents -> message PASSWORD_MISMATCH."""
        url = "/api/auth/registration/"
        data = {
            "email": "mismatch@example.com",
            "password1": "TestPassword123!",
            "password2": "DifferentPassword123!",
            "pseudo": "mismatchuser",
        }

        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        # L'erreur peut être sur password1, password2 ou non_field_errors
        all_messages = []
        for key in ("password1", "password2", "non_field_errors"):
            all_messages.extend(errors.get(key, []))

        assert UserErrors.PASSWORD_MISMATCH in all_messages


@pytest.mark.django_db
class TestAvatarErrorMessages:
    @staticmethod
    def create_large_png():
        """
        Crée une image PNG volontairement volumineuse (> 2 Mo)
        pour tester la validation de taille d'avatar.
        """
        img = Image.new("RGB", (2000, 2000), color="red")
        img_io = io.BytesIO()
        img.save(img_io, format="PNG", compress_level=0)
        img_io.seek(0)
        img_io.name = "large_avatar.png"
        return img_io

    def test_avatar_too_large_message(self, auth_client_with_tokens):
        """Upload d'un avatar trop volumineux -> message AVATAR_TOO_LARGE."""
        url = "/api/auth/user/"
        large_file = self.create_large_png()

        response = auth_client_with_tokens.patch(
            url,
            {"avatar": large_file},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        assert "avatar" in errors
        # On vérifie que le message fonctionnel est présent
        assert any(UserErrors.AVATAR_TOO_LARGE in str(error) for error in errors["avatar"])

    def test_avatar_invalid_extension_message(self, auth_client_with_tokens):
        """Upload d'un avatar avec extension non supportée -> message AVATAR_INVALID_FORMAT."""
        url = "/api/auth/user/"

        # Créer une image avec une extension non supportée (bmp)
        img = Image.new("RGB", (100, 100), color="green")
        img_io = io.BytesIO()
        img.save(img_io, format="BMP")
        img_io.seek(0)
        img_io.name = "test_avatar.bmp"

        response = auth_client_with_tokens.patch(
            url,
            {"avatar": img_io},
            format="multipart",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data.get("success") is False

        errors = get_errors_payload(response)
        assert "avatar" in errors
        assert any(UserErrors.AVATAR_INVALID_FORMAT in str(error) for error in errors["avatar"])
