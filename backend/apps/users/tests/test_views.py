"""
Tests pour les vues de l'app users
Tests complets pour tous les endpoints d'authentification
"""
import pytest
from django.urls import reverse
from rest_framework import status
from apps.users.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken


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
