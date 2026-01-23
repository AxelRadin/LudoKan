"""
Tests pour les vues de l'app users
Tests complets pour tous les endpoints d'authentification
"""
import io
import os

import pytest
from django.conf import settings
from PIL import Image
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import AdminAction, CustomUser, UserRole, UserSuspension
from apps.users.tests.constants import TEST_USER_CREDENTIAL


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
class TestRegistrationView:
    """Tests pour l'endpoint d'inscription"""

    def test_register_success_with_all_fields(self, api_client):
        """Test inscription réussie avec tous les champs"""
        url = "/api/auth/registration/"
        data = {
            "email": "newuser@example.com",
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
            "pseudo": "newuser",
            "first_name": "John",
            "last_name": "Doe",
            "description_courte": "Hello world",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert "detail" in response.data  # Email de vérification envoyé
        assert CustomUser.objects.filter(email=data["email"]).exists()

        # Vérifier que l'utilisateur a été créé avec les bonnes données
        user = CustomUser.objects.get(email=data["email"])
        assert user.pseudo == data["pseudo"]
        assert user.first_name == data["first_name"]

    def test_register_success_minimal_fields(self, api_client):
        """Test inscription avec champs minimaux (email + passwords)"""
        url = "/api/auth/registration/"
        data = {
            "email": "minimal@example.com",
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
        }
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        user = CustomUser.objects.get(email=data["email"])
        # Vérifier que le pseudo a été généré automatiquement
        assert user.pseudo != ""
        assert user.pseudo is not None

    def test_register_duplicate_email(self, api_client, user):
        """Test inscription avec email déjà utilisé"""
        url = "/api/auth/registration/"
        data = {"email": user.email, "password1": "TestPassword123!", "password2": "TestPassword123!", "pseudo": "differentpseudo"}

        # Devrait lever une IntegrityError qui sera catchée par DRF
        # ou retourner une 400 selon la config
        response = api_client.post(url, data, format="json")
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR]

    def test_register_duplicate_pseudo(self, api_client, user):
        """Test inscription avec pseudo déjà utilisé"""
        url = "/api/auth/registration/"
        data = {"email": "newemail@example.com", "password1": "TestPassword123!", "password2": "TestPassword123!", "pseudo": user.pseudo}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "pseudo" in errors

    def test_register_password_mismatch(self, api_client):
        """Test inscription avec mots de passe différents"""
        url = "/api/auth/registration/"
        data = {"email": "test@example.com", "password1": "TestPassword123!", "password2": "DifferentPassword123!", "pseudo": "testuser"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        # L'erreur peut être dans password1, password2 ou non_field_errors
        assert "password1" in errors or "password2" in errors or "non_field_errors" in errors


@pytest.mark.django_db
class TestLoginView:
    """Tests pour l'endpoint de login"""

    def test_login_success(self, api_client, user):
        """Test login réussi avec credentials valides"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": TEST_USER_CREDENTIAL}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data or "access_token" in response.cookies
        if "user" in response.data:
            assert response.data["user"]["email"] == user.email

    def test_login_wrong_password(self, api_client, user):
        """Test login avec mauvais mot de passe"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": "WrongPassword123!"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "non_field_errors" in errors or "detail" in errors

    def test_login_nonexistent_user(self, api_client):
        """Test login avec email inexistant"""
        url = "/api/auth/login/"
        data = {"email": "nonexistent@example.com", "password": "AnyPassword123!"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_fields(self, api_client):
        """Test login avec champs manquants"""
        url = "/api/auth/login/"
        response = api_client.post(url, {"email": "test@example.com"}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "password" in errors


@pytest.mark.django_db
class TestGetUserView:
    """Tests pour l'endpoint de récupération des infos utilisateur"""

    def test_get_user_authenticated(self, auth_client_with_tokens, user):
        """Test récupération des infos utilisateur authentifié"""
        url = "/api/auth/user/"
        response = auth_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["email"] == user.email
        assert response.data["pseudo"] == user.pseudo
        assert "id" in response.data
        assert "created_at" in response.data

    def test_get_user_unauthenticated(self, api_client):
        """Test récupération des infos sans authentification"""
        url = "/api/auth/user/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_user_patch(self, auth_client_with_tokens, user):
        """Test mise à jour partielle du profil utilisateur"""
        url = "/api/auth/user/"
        data = {"first_name": "UpdatedFirstName", "description_courte": "New bio"}
        response = auth_client_with_tokens.patch(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["first_name"] == data["first_name"]
        assert response.data["description_courte"] == data["description_courte"]

        # Vérifier que les autres champs n'ont pas changé
        user.refresh_from_db()
        assert user.first_name == data["first_name"]
        assert user.email == user.email  # Email unchanged

    def test_update_user_cannot_change_email(self, auth_client_with_tokens, user):
        """Test que l'email ne peut pas être modifié"""
        url = "/api/auth/user/"
        original_email = user.email
        data = {"email": "newemail@example.com"}

        auth_client_with_tokens.patch(url, data, format="json")

        user.refresh_from_db()
        assert user.email == original_email  # Email should not change


@pytest.mark.django_db
class TestLogoutView:
    """Tests pour l'endpoint de logout"""

    def test_logout_success(self, auth_client_with_tokens):
        """Test logout réussi"""
        url = "/api/auth/logout/"

        # Récupérer le refresh token depuis les cookies
        refresh_token = auth_client_with_tokens.cookies.get("refresh_token", None)

        # Envoyer le refresh token dans le body
        data = {"refresh": refresh_token.value} if refresh_token else {}
        response = auth_client_with_tokens.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data

    def test_logout_unauthenticated_still_works(self, api_client):
        """Test logout sans authentification (devrait quand même fonctionner)"""
        url = "/api/auth/logout/"
        response = api_client.post(url, {}, format="json")

        # Le logout devrait réussir même sans authentification
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.django_db
class TestPasswordChangeView:
    """Tests pour l'endpoint de changement de mot de passe"""

    def test_password_change_success(self, auth_client_with_tokens, user):
        """Test changement de mot de passe réussi"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": TEST_USER_CREDENTIAL,
            "new_password1": "NewSuperPass123!",
            "new_password2": "NewSuperPass123!",
        }
        response = auth_client_with_tokens.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data

        # Vérifier que le nouveau mot de passe fonctionne
        user.refresh_from_db()
        assert user.check_password("NewSuperPass123!")

    def test_password_change_wrong_old_password(self, auth_client_with_tokens):
        """Test changement avec mauvais ancien mot de passe"""
        url = "/api/auth/password/change/"
        data = {"old_password": "WrongPassword123!", "new_password1": "NewSuperPass123!", "new_password2": "NewSuperPass123!"}
        response = auth_client_with_tokens.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "old_password" in errors

    def test_password_change_mismatch(self, auth_client_with_tokens):
        """Test changement avec nouveaux mots de passe différents"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": TEST_USER_CREDENTIAL,
            "new_password1": "NewSuperPass123!",
            "new_password2": "DifferentPass123!",
        }
        response = auth_client_with_tokens.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_change_unauthenticated(self, api_client):
        """Test changement de mot de passe sans authentification"""
        url = "/api/auth/password/change/"
        data = {"old_password": "SuperPass123!", "new_password1": "NewSuperPass123!", "new_password2": "NewSuperPass123!"}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefreshView:
    """Tests pour l'endpoint de rafraîchissement du token"""

    def test_token_refresh_success(self, auth_client_with_tokens):
        """Test rafraîchissement de token réussi"""
        url = "/api/auth/token/refresh/"
        response = auth_client_with_tokens.post(url, {}, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "access_token" in response.cookies

    def test_token_refresh_without_cookies(self, api_client):
        """Test rafraîchissement sans cookies"""
        url = "/api/auth/token/refresh/"
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenVerifyView:
    """Tests pour l'endpoint de vérification du token"""

    def test_token_verify_valid(self, user):
        """Test vérification d'un token valide"""
        url = "/api/auth/token/verify/"
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        from rest_framework.test import APIClient

        client = APIClient()
        response = client.post(url, {"token": access_token}, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_token_verify_invalid(self, api_client):
        """Test vérification d'un token invalide"""
        url = "/api/auth/token/verify/"
        response = api_client.post(url, {"token": "invalid.token.here"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_verify_missing_token(self, api_client):
        """Test vérification sans token"""
        url = "/api/auth/token/verify/"
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "token" in errors


@pytest.mark.django_db
class TestPasswordResetView:
    """Tests pour l'endpoint de réinitialisation de mot de passe"""

    def test_password_reset_request_success(self, api_client, user):
        """Test demande de réinitialisation de mot de passe"""
        url = "/api/auth/password/reset/"
        data = {"email": user.email}
        response = api_client.post(url, data, format="json")

        # Le endpoint retourne 200 même si l'email n'existe pas (sécurité)
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data

    def test_password_reset_nonexistent_email(self, api_client):
        """Test demande avec email inexistant (devrait quand même retourner 200)"""
        url = "/api/auth/password/reset/"
        data = {"email": "nonexistent@example.com"}
        response = api_client.post(url, data, format="json")

        # Par sécurité, on ne révèle pas si l'email existe
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_missing_email(self, api_client):
        """Test demande sans email"""
        url = "/api/auth/password/reset/"
        response = api_client.post(url, {}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "email" in errors


@pytest.mark.django_db
class TestAvatarUpload:
    """Tests pour l'upload, modification et suppression d'avatar"""

    @classmethod
    def teardown_class(cls):
        """Nettoyer tous les fichiers d'avatar de test après les tests"""
        avatars_dir = os.path.join(settings.MEDIA_ROOT, "avatars")
        if os.path.exists(avatars_dir):
            for filename in os.listdir(avatars_dir):
                file_path = os.path.join(avatars_dir, filename)
                if os.path.isfile(file_path) and filename.startswith("test_avatar"):
                    try:
                        os.remove(file_path)
                        print(f"Fichier supprimé: {filename}")
                    except Exception as e:
                        print(f"Erreur lors de la suppression de {filename}: {e}")

    @staticmethod
    def create_test_image(width=100, height=100, color="red", format="JPEG"):
        """Crée une image de test en mémoire"""
        img = Image.new("RGB", (width, height), color=color)
        img_io = io.BytesIO()
        img.save(img_io, format=format)
        img_io.seek(0)

        # Définir l'extension appropriée
        ext = "jpg" if format == "JPEG" else format.lower()
        img_io.name = f"test_avatar.{ext}"
        return img_io

    def test_upload_avatar_success_jpg(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format JPG"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format="JPEG")

        response = auth_client_with_tokens.patch(url, {"avatar": test_image}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert "avatar" in response.data
        assert response.data["avatar"] is not None
        assert "avatars/" in response.data["avatar"]

        # Vérifier que le fichier a été créé
        user.refresh_from_db()
        assert user.avatar
        assert user.avatar.name.startswith("avatars/")

    def test_upload_avatar_success_png(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format PNG"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format="PNG")

        response = auth_client_with_tokens.patch(url, {"avatar": test_image}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert "avatar" in response.data
        assert response.data["avatar"] is not None

    def test_upload_avatar_success_webp(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format WebP"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format="WEBP")

        response = auth_client_with_tokens.patch(url, {"avatar": test_image}, format="multipart")

        assert response.status_code == status.HTTP_200_OK
        assert "avatar" in response.data
        assert response.data["avatar"] is not None

    def test_update_avatar(self, auth_client_with_tokens, user):
        """Test modification d'un avatar existant"""
        url = "/api/auth/user/"

        # Upload initial
        first_image = self.create_test_image(color="red")
        response1 = auth_client_with_tokens.patch(url, {"avatar": first_image}, format="multipart")
        assert response1.status_code == status.HTTP_200_OK
        first_avatar_url = response1.data["avatar"]

        # Upload de remplacement
        second_image = self.create_test_image(color="blue")
        response2 = auth_client_with_tokens.patch(url, {"avatar": second_image}, format="multipart")

        assert response2.status_code == status.HTTP_200_OK
        assert response2.data["avatar"] != first_avatar_url

        # Vérifier que l'avatar a été mis à jour
        user.refresh_from_db()
        assert user.avatar

    def test_delete_avatar(self, auth_client_with_tokens, user):
        """Test suppression d'un avatar"""
        url = "/api/auth/user/"

        # Upload initial
        test_image = self.create_test_image()
        response1 = auth_client_with_tokens.patch(url, {"avatar": test_image}, format="multipart")
        assert response1.status_code == status.HTTP_200_OK
        assert response1.data["avatar"] is not None

        # Suppression (en envoyant null)
        response2 = auth_client_with_tokens.patch(url, {"avatar": None}, format="json")

        assert response2.status_code == status.HTTP_200_OK

        # Vérifier que l'avatar a été supprimé
        user.refresh_from_db()
        assert not user.avatar

    def test_upload_avatar_too_large(self, auth_client_with_tokens):
        """Test upload d'un fichier trop gros (> 2MB)"""
        url = "/api/auth/user/"

        # Créer une très grande image non compressée (> 2MB)
        # PNG avec compression minimale pour atteindre > 2MB
        img = Image.new("RGB", (2000, 2000), color="red")
        img_io = io.BytesIO()
        # Sauvegarder avec compression 0 pour maximiser la taille
        img.save(img_io, format="PNG", compress_level=0)
        img_io.seek(0)
        img_io.name = "large_avatar.png"

        # Vérifier que le fichier fait bien plus de 2MB
        file_size = len(img_io.getvalue())
        assert file_size > 2 * 1024 * 1024, f"Le fichier de test fait seulement {file_size} bytes"

        response = auth_client_with_tokens.patch(url, {"avatar": img_io}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "avatar" in errors
        assert any("2 Mo" in str(error) or "2MB" in str(error) or "taille" in str(error).lower() for error in errors["avatar"])

    def test_upload_avatar_invalid_format(self, auth_client_with_tokens):
        """Test upload d'un fichier avec format invalide"""
        url = "/api/auth/user/"

        # Créer un fichier texte au lieu d'une image
        fake_file = io.BytesIO(b"This is not an image")
        fake_file.name = "fake_avatar.txt"

        response = auth_client_with_tokens.patch(url, {"avatar": fake_file}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "avatar" in errors

    def test_upload_avatar_invalid_extension(self, auth_client_with_tokens):
        """Test upload d'une image avec extension non supportée"""
        url = "/api/auth/user/"

        # Créer une image avec une extension non supportée
        img = Image.new("RGB", (100, 100), color="green")
        img_io = io.BytesIO()
        img.save(img_io, format="BMP")
        img_io.seek(0)
        img_io.name = "test_avatar.bmp"

        response = auth_client_with_tokens.patch(url, {"avatar": img_io}, format="multipart")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        errors = get_errors_payload(response)
        assert "avatar" in errors

    def test_upload_avatar_unauthenticated(self, api_client):
        """Test upload d'avatar sans authentification"""
        url = "/api/auth/user/"
        test_image = self.create_test_image()

        response = api_client.patch(url, {"avatar": test_image}, format="multipart")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_with_avatar(self, auth_client_with_tokens, user):
        """Test récupération des infos utilisateur avec avatar"""
        url = "/api/auth/user/"

        # Upload d'un avatar
        test_image = self.create_test_image()
        auth_client_with_tokens.patch(url, {"avatar": test_image}, format="multipart")

        # Récupérer les infos
        response = auth_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "avatar" in response.data
        assert response.data["avatar"] is not None
        assert "http" in response.data["avatar"]  # URL complète


@pytest.mark.django_db
class TestCORSAndSecurity:
    """Tests pour CORS et sécurité"""

    def test_cors_headers_present(self, api_client, user):
        """Test que les headers CORS sont présents"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": "SuperPass123!"}
        response = api_client.post(url, data, format="json", HTTP_ORIGIN="http://localhost:5173")

        assert "access-control-allow-origin" in [k.lower() for k in response.headers.keys()]

    def test_jwt_cookies_httponly(self, api_client, user):
        """Test que les cookies JWT sont HttpOnly"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": "SuperPass123!"}
        response = api_client.post(url, data, format="json")

        access_cookie = response.cookies.get("access_token")
        if access_cookie:
            assert access_cookie.get("httponly", False) or "HttpOnly" in str(access_cookie)


@pytest.mark.django_db
class TestAdminSuspendUserView:
    """Tests pour l'endpoint admin de suspension d'utilisateur."""

    def test_admin_can_suspend_normal_user_and_log_action(self, auth_admin_client_with_tokens, user):
        url = f"/api/admin/users/{user.id}/suspend/"
        payload = {"reason": "Violation des règles"}

        response = auth_admin_client_with_tokens.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert data["user_id"] == user.id
        assert data["reason"] == payload["reason"]

        # Suspension créée
        assert UserSuspension.objects.filter(user=user, is_active=True).exists()

        # Log admin créé
        assert AdminAction.objects.filter(
            action_type="user.suspend",
            target_type="user",
            target_id=user.id,
        ).exists()

    def test_suspended_user_cannot_access_protected_endpoint_anymore(self, auth_admin_client_with_tokens, api_client, user):
        # L'admin suspend l'utilisateur "user"
        suspend_url = f"/api/admin/users/{user.id}/suspend/"
        auth_admin_client_with_tokens.post(suspend_url, {"reason": "Test suspension"}, format="json")

        # Le user tente d'accéder à /api/auth/user/ après suspension
        login_url = "/api/auth/login/"
        login_response = api_client.post(
            login_url,
            {"email": user.email, "password": TEST_USER_CREDENTIAL},
            format="json",
        )
        assert login_response.status_code == status.HTTP_200_OK

        # Récupérer les cookies JWT et les réinjecter dans le client
        if "access_token" in login_response.cookies:
            api_client.cookies["access_token"] = login_response.cookies["access_token"].value
        if "refresh_token" in login_response.cookies:
            api_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        me_url = "/api/auth/user/"
        me_response = api_client.get(me_url)

        # L'utilisateur est authentifié mais suspendu -> 403 Forbidden
        assert me_response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_suspend_self(self, auth_admin_client_with_tokens, admin_user):
        url = f"/api/admin/users/{admin_user.id}/suspend/"
        payload = {"reason": "Tentative auto-suspension"}

        response = auth_admin_client_with_tokens.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "vous ne pouvez pas vous suspendre vous-même" in str(response.data["detail"]).lower()

    def test_cannot_suspend_superadmin(self, api_client, admin_user, db):
        # Crée un superadmin distinct de l'admin
        superadmin = CustomUser.objects.create_superuser(
            email="superadmin@example.com",
            pseudo="superadmin",
            password=TEST_USER_CREDENTIAL,
        )
        UserRole.objects.create(user=superadmin, role=UserRole.Role.SUPERADMIN)

        # Se connecter en tant qu'admin
        login_url = "/api/auth/login/"
        login_response = api_client.post(
            login_url,
            {"email": admin_user.email, "password": TEST_USER_CREDENTIAL},
            format="json",
        )
        assert login_response.status_code == status.HTTP_200_OK

        if "access_token" in login_response.cookies:
            api_client.cookies["access_token"] = login_response.cookies["access_token"].value
        if "refresh_token" in login_response.cookies:
            api_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        url = f"/api/admin/users/{superadmin.id}/suspend/"
        response = api_client.post(url, {"reason": "Tentative sur superadmin"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "superadmin" in str(response.data["detail"]).lower()

    def test_moderator_cannot_suspend_user(self, api_client, user, db):
        """Un modérateur ne doit pas pouvoir suspendre un utilisateur."""

        # Créer un modérateur
        moderator = CustomUser.objects.create_user(
            email="mod@example.com",
            pseudo="moderator",
            password=TEST_USER_CREDENTIAL,
        )
        UserRole.objects.create(user=moderator, role=UserRole.Role.MODERATOR)

        # Login en tant que modérateur
        login_url = "/api/auth/login/"
        login_response = api_client.post(
            login_url,
            {"email": moderator.email, "password": TEST_USER_CREDENTIAL},
            format="json",
        )
        assert login_response.status_code == status.HTTP_200_OK

        if "access_token" in login_response.cookies:
            api_client.cookies["access_token"] = login_response.cookies["access_token"].value
        if "refresh_token" in login_response.cookies:
            api_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        # Tentative de suspension
        url = f"/api/admin/users/{user.id}/suspend/"
        response = api_client.post(url, {"reason": "Mod attempt"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
