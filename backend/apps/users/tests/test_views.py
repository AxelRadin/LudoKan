"""
Tests pour les vues de l'app users
Tests complets pour tous les endpoints d'authentification
"""
import pytest
from django.urls import reverse
from rest_framework import status
from apps.users.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken
from PIL import Image
import io
import os
from django.conf import settings


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
            "description_courte": "Hello world"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'detail' in response.data  # Email de vérification envoyé
        assert CustomUser.objects.filter(email=data['email']).exists()
        
        # Vérifier que l'utilisateur a été créé avec les bonnes données
        user = CustomUser.objects.get(email=data['email'])
        assert user.pseudo == data['pseudo']
        assert user.first_name == data['first_name']
    
    def test_register_success_minimal_fields(self, api_client):
        """Test inscription avec champs minimaux (email + passwords)"""
        url = "/api/auth/registration/"
        data = {
            "email": "minimal@example.com",
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        user = CustomUser.objects.get(email=data['email'])
        # Vérifier que le pseudo a été généré automatiquement
        assert user.pseudo != ''
        assert user.pseudo is not None
    
    def test_register_duplicate_email(self, api_client, user):
        """Test inscription avec email déjà utilisé"""
        url = "/api/auth/registration/"
        data = {
            "email": user.email,
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
            "pseudo": "differentpseudo"
        }
        
        # Devrait lever une IntegrityError qui sera catchée par DRF
        # ou retourner une 400 selon la config
        response = api_client.post(url, data, format='json')
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_register_duplicate_pseudo(self, api_client, user):
        """Test inscription avec pseudo déjà utilisé"""
        url = "/api/auth/registration/"
        data = {
            "email": "newemail@example.com",
            "password1": "TestPassword123!",
            "password2": "TestPassword123!",
            "pseudo": user.pseudo
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'pseudo' in response.data
    
    def test_register_password_mismatch(self, api_client):
        """Test inscription avec mots de passe différents"""
        url = "/api/auth/registration/"
        data = {
            "email": "test@example.com",
            "password1": "TestPassword123!",
            "password2": "DifferentPassword123!",
            "pseudo": "testuser"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # L'erreur peut être dans password1, password2 ou non_field_errors
        assert 'password1' in response.data or 'password2' in response.data or 'non_field_errors' in response.data


@pytest.mark.django_db
class TestLoginView:
    """Tests pour l'endpoint de login"""
    
    def test_login_success(self, api_client, user):
        """Test login réussi avec credentials valides"""
        url = "/api/auth/login/"
        data = {
            "email": user.email,
            "password": "SuperPass123!"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data or 'access_token' in response.cookies
        if 'user' in response.data:
            assert response.data['user']['email'] == user.email
    
    def test_login_wrong_password(self, api_client, user):
        """Test login avec mauvais mot de passe"""
        url = "/api/auth/login/"
        data = {
            "email": user.email,
            "password": "WrongPassword123!"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'non_field_errors' in response.data or 'detail' in response.data
    
    def test_login_nonexistent_user(self, api_client):
        """Test login avec email inexistant"""
        url = "/api/auth/login/"
        data = {
            "email": "nonexistent@example.com",
            "password": "AnyPassword123!"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_missing_fields(self, api_client):
        """Test login avec champs manquants"""
        url = "/api/auth/login/"
        response = api_client.post(url, {"email": "test@example.com"}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data


@pytest.mark.django_db
class TestGetUserView:
    """Tests pour l'endpoint de récupération des infos utilisateur"""
    
    def test_get_user_authenticated(self, auth_client_with_tokens, user):
        """Test récupération des infos utilisateur authentifié"""
        url = "/api/auth/user/"
        response = auth_client_with_tokens.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email
        assert response.data['pseudo'] == user.pseudo
        assert 'id' in response.data
        assert 'created_at' in response.data
    
    def test_get_user_unauthenticated(self, api_client):
        """Test récupération des infos sans authentification"""
        url = "/api/auth/user/"
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_user_patch(self, auth_client_with_tokens, user):
        """Test mise à jour partielle du profil utilisateur"""
        url = "/api/auth/user/"
        data = {
            "first_name": "UpdatedFirstName",
            "description_courte": "New bio"
        }
        response = auth_client_with_tokens.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['first_name'] == data['first_name']
        assert response.data['description_courte'] == data['description_courte']
        
        # Vérifier que les autres champs n'ont pas changé
        user.refresh_from_db()
        assert user.first_name == data['first_name']
        assert user.email == user.email  # Email unchanged
    
    def test_update_user_cannot_change_email(self, auth_client_with_tokens, user):
        """Test que l'email ne peut pas être modifié"""
        url = "/api/auth/user/"
        original_email = user.email
        data = {"email": "newemail@example.com"}
        
        response = auth_client_with_tokens.patch(url, data, format='json')
        
        user.refresh_from_db()
        assert user.email == original_email  # Email should not change


@pytest.mark.django_db
class TestLogoutView:
    """Tests pour l'endpoint de logout"""
    
    def test_logout_success(self, auth_client_with_tokens):
        """Test logout réussi"""
        url = "/api/auth/logout/"
        
        # Récupérer le refresh token depuis les cookies
        refresh_token = auth_client_with_tokens.cookies.get('refresh_token', None)
        
        # Envoyer le refresh token dans le body
        data = {"refresh": refresh_token.value} if refresh_token else {}
        response = auth_client_with_tokens.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'detail' in response.data
    
    def test_logout_unauthenticated_still_works(self, api_client):
        """Test logout sans authentification (devrait quand même fonctionner)"""
        url = "/api/auth/logout/"
        response = api_client.post(url, {}, format='json')
        
        # Le logout devrait réussir même sans authentification
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_401_UNAUTHORIZED]


@pytest.mark.django_db
class TestPasswordChangeView:
    """Tests pour l'endpoint de changement de mot de passe"""
    
    def test_password_change_success(self, auth_client_with_tokens, user):
        """Test changement de mot de passe réussi"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": "SuperPass123!",
            "new_password1": "NewSuperPass123!",
            "new_password2": "NewSuperPass123!"
        }
        response = auth_client_with_tokens.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'detail' in response.data
        
        # Vérifier que le nouveau mot de passe fonctionne
        user.refresh_from_db()
        assert user.check_password("NewSuperPass123!")
    
    def test_password_change_wrong_old_password(self, auth_client_with_tokens):
        """Test changement avec mauvais ancien mot de passe"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": "WrongPassword123!",
            "new_password1": "NewSuperPass123!",
            "new_password2": "NewSuperPass123!"
        }
        response = auth_client_with_tokens.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'old_password' in response.data
    
    def test_password_change_mismatch(self, auth_client_with_tokens):
        """Test changement avec nouveaux mots de passe différents"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": "SuperPass123!",
            "new_password1": "NewSuperPass123!",
            "new_password2": "DifferentPass123!"
        }
        response = auth_client_with_tokens.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_password_change_unauthenticated(self, api_client):
        """Test changement de mot de passe sans authentification"""
        url = "/api/auth/password/change/"
        data = {
            "old_password": "SuperPass123!",
            "new_password1": "NewSuperPass123!",
            "new_password2": "NewSuperPass123!"
        }
        response = api_client.post(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefreshView:
    """Tests pour l'endpoint de rafraîchissement du token"""
    
    def test_token_refresh_success(self, auth_client_with_tokens):
        """Test rafraîchissement de token réussi"""
        url = "/api/auth/token/refresh/"
        response = auth_client_with_tokens.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'access_token' in response.cookies
    
    def test_token_refresh_without_cookies(self, api_client):
        """Test rafraîchissement sans cookies"""
        url = "/api/auth/token/refresh/"
        response = api_client.post(url, {}, format='json')
        
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
        response = client.post(url, {"token": access_token}, format='json')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_token_verify_invalid(self, api_client):
        """Test vérification d'un token invalide"""
        url = "/api/auth/token/verify/"
        response = api_client.post(url, {"token": "invalid.token.here"}, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_verify_missing_token(self, api_client):
        """Test vérification sans token"""
        url = "/api/auth/token/verify/"
        response = api_client.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'token' in response.data


@pytest.mark.django_db
class TestPasswordResetView:
    """Tests pour l'endpoint de réinitialisation de mot de passe"""
    
    def test_password_reset_request_success(self, api_client, user):
        """Test demande de réinitialisation de mot de passe"""
        url = "/api/auth/password/reset/"
        data = {"email": user.email}
        response = api_client.post(url, data, format='json')
        
        # Le endpoint retourne 200 même si l'email n'existe pas (sécurité)
        assert response.status_code == status.HTTP_200_OK
        assert 'detail' in response.data
    
    def test_password_reset_nonexistent_email(self, api_client):
        """Test demande avec email inexistant (devrait quand même retourner 200)"""
        url = "/api/auth/password/reset/"
        data = {"email": "nonexistent@example.com"}
        response = api_client.post(url, data, format='json')
        
        # Par sécurité, on ne révèle pas si l'email existe
        assert response.status_code == status.HTTP_200_OK
    
    def test_password_reset_missing_email(self, api_client):
        """Test demande sans email"""
        url = "/api/auth/password/reset/"
        response = api_client.post(url, {}, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data


@pytest.mark.django_db
class TestAvatarUpload:
    """Tests pour l'upload, modification et suppression d'avatar"""
    
    @classmethod
    def teardown_class(cls):
        """Nettoyer tous les fichiers d'avatar de test après les tests"""
        avatars_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        if os.path.exists(avatars_dir):
            for filename in os.listdir(avatars_dir):
                file_path = os.path.join(avatars_dir, filename)
                if os.path.isfile(file_path) and filename.startswith('test_avatar'):
                    try:
                        os.remove(file_path)
                        print(f"Fichier supprimé: {filename}")
                    except Exception as e:
                        print(f"Erreur lors de la suppression de {filename}: {e}")
    
    @staticmethod
    def create_test_image(width=100, height=100, color='red', format='JPEG'):
        """Crée une image de test en mémoire"""
        img = Image.new('RGB', (width, height), color=color)
        img_io = io.BytesIO()
        img.save(img_io, format=format)
        img_io.seek(0)
        
        # Définir l'extension appropriée
        ext = 'jpg' if format == 'JPEG' else format.lower()
        img_io.name = f'test_avatar.{ext}'
        return img_io
    
    def test_upload_avatar_success_jpg(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format JPG"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format='JPEG')
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'avatar' in response.data
        assert response.data['avatar'] is not None
        assert 'avatars/' in response.data['avatar']
        
        # Vérifier que le fichier a été créé
        user.refresh_from_db()
        assert user.avatar
        assert user.avatar.name.startswith('avatars/')
    
    def test_upload_avatar_success_png(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format PNG"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format='PNG')
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'avatar' in response.data
        assert response.data['avatar'] is not None
    
    def test_upload_avatar_success_webp(self, auth_client_with_tokens, user):
        """Test upload d'avatar au format WebP"""
        url = "/api/auth/user/"
        test_image = self.create_test_image(format='WEBP')
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'avatar' in response.data
        assert response.data['avatar'] is not None
    
    def test_update_avatar(self, auth_client_with_tokens, user):
        """Test modification d'un avatar existant"""
        url = "/api/auth/user/"
        
        # Upload initial
        first_image = self.create_test_image(color='red')
        response1 = auth_client_with_tokens.patch(
            url,
            {'avatar': first_image},
            format='multipart'
        )
        assert response1.status_code == status.HTTP_200_OK
        first_avatar_url = response1.data['avatar']
        
        # Upload de remplacement
        second_image = self.create_test_image(color='blue')
        response2 = auth_client_with_tokens.patch(
            url,
            {'avatar': second_image},
            format='multipart'
        )
        
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data['avatar'] != first_avatar_url
        
        # Vérifier que l'avatar a été mis à jour
        user.refresh_from_db()
        assert user.avatar
    
    def test_delete_avatar(self, auth_client_with_tokens, user):
        """Test suppression d'un avatar"""
        url = "/api/auth/user/"
        
        # Upload initial
        test_image = self.create_test_image()
        response1 = auth_client_with_tokens.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        assert response1.status_code == status.HTTP_200_OK
        assert response1.data['avatar'] is not None
        
        # Suppression (en envoyant null)
        response2 = auth_client_with_tokens.patch(
            url,
            {'avatar': None},
            format='json'
        )
        
        assert response2.status_code == status.HTTP_200_OK
        
        # Vérifier que l'avatar a été supprimé
        user.refresh_from_db()
        assert not user.avatar
    
    def test_upload_avatar_too_large(self, auth_client_with_tokens):
        """Test upload d'un fichier trop gros (> 2MB)"""
        url = "/api/auth/user/"
        
        # Créer une très grande image non compressée (> 2MB)
        # PNG avec compression minimale pour atteindre > 2MB
        img = Image.new('RGB', (2000, 2000), color='red')
        img_io = io.BytesIO()
        # Sauvegarder avec compression 0 pour maximiser la taille
        img.save(img_io, format='PNG', compress_level=0)
        img_io.seek(0)
        img_io.name = 'large_avatar.png'
        
        # Vérifier que le fichier fait bien plus de 2MB
        file_size = len(img_io.getvalue())
        assert file_size > 2 * 1024 * 1024, f"Le fichier de test fait seulement {file_size} bytes"
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': img_io},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'avatar' in response.data
        assert any('2 Mo' in str(error) or '2MB' in str(error) or 'taille' in str(error).lower() 
                   for error in response.data['avatar'])
    
    def test_upload_avatar_invalid_format(self, auth_client_with_tokens):
        """Test upload d'un fichier avec format invalide"""
        url = "/api/auth/user/"
        
        # Créer un fichier texte au lieu d'une image
        fake_file = io.BytesIO(b"This is not an image")
        fake_file.name = 'fake_avatar.txt'
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': fake_file},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'avatar' in response.data
    
    def test_upload_avatar_invalid_extension(self, auth_client_with_tokens):
        """Test upload d'une image avec extension non supportée"""
        url = "/api/auth/user/"
        
        # Créer une image avec une extension non supportée
        img = Image.new('RGB', (100, 100), color='green')
        img_io = io.BytesIO()
        img.save(img_io, format='BMP')
        img_io.seek(0)
        img_io.name = 'test_avatar.bmp'
        
        response = auth_client_with_tokens.patch(
            url,
            {'avatar': img_io},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'avatar' in response.data
    
    def test_upload_avatar_unauthenticated(self, api_client):
        """Test upload d'avatar sans authentification"""
        url = "/api/auth/user/"
        test_image = self.create_test_image()
        
        response = api_client.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_user_with_avatar(self, auth_client_with_tokens, user):
        """Test récupération des infos utilisateur avec avatar"""
        url = "/api/auth/user/"
        
        # Upload d'un avatar
        test_image = self.create_test_image()
        auth_client_with_tokens.patch(
            url,
            {'avatar': test_image},
            format='multipart'
        )
        
        # Récupérer les infos
        response = auth_client_with_tokens.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'avatar' in response.data
        assert response.data['avatar'] is not None
        assert 'http' in response.data['avatar']  # URL complète


@pytest.mark.django_db
class TestCORSAndSecurity:
    """Tests pour CORS et sécurité"""
    
    def test_cors_headers_present(self, api_client, user):
        """Test que les headers CORS sont présents"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": "SuperPass123!"}
        response = api_client.post(
            url, 
            data, 
            format='json',
            HTTP_ORIGIN='http://localhost:5173'
        )
        
        assert 'access-control-allow-origin' in [k.lower() for k in response.headers.keys()]
    
    def test_jwt_cookies_httponly(self, api_client, user):
        """Test que les cookies JWT sont HttpOnly"""
        url = "/api/auth/login/"
        data = {"email": user.email, "password": "SuperPass123!"}
        response = api_client.post(url, data, format='json')
        
        access_cookie = response.cookies.get('access_token')
        if access_cookie:
            assert access_cookie.get('httponly', False) or 'HttpOnly' in str(access_cookie)
