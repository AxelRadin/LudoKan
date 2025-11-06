"""
Tests pour les serializers de l'app users
"""
import pytest
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.skip(reason="Serializer pas encore implémenté")
class TestUserRegistrationSerializer:
    """Tests pour le serializer d'inscription"""
    
    def test_valid_registration_data(self, sample_user_data):
        """Test avec des données d'inscription valides"""
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_invalid_email_format(self):
        """Test avec un email invalide"""
        invalid_data = {
            'username': 'testuser',
            'email': 'invalid-email',
            'password': 'testpass123'
        }
        
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_password_too_short(self):
        """Test avec un mot de passe trop court"""
        invalid_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': '123'
        }
        
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_username_already_exists(self, user):
        """Test avec un nom d'utilisateur déjà existant"""
        invalid_data = {
            'username': user.username,
            'email': 'new@example.com',
            'password': 'testpass123'
        }
        
        # Ce test sera implémenté quand le serializer sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Serializer pas encore implémenté")
class TestUserProfileSerializer:
    """Tests pour le serializer de profil utilisateur"""
    
    def test_valid_profile_data(self, user):
        """Test avec des données de profil valides"""
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_update_profile_partial(self, user):
        """Test de mise à jour partielle du profil"""
        # Ce test sera implémenté quand le serializer sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Serializer pas encore implémenté")
class TestUserLoginSerializer:
    """Tests pour le serializer de connexion"""
    
    def test_valid_login_data(self, user):
        """Test avec des données de connexion valides"""
        login_data = {
            'username': user.username,
            'password': 'testpass123'
        }
        
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_invalid_credentials(self):
        """Test avec des identifiants invalides"""
        invalid_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword'
        }
        
        # Ce test sera implémenté quand le serializer sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Serializer pas encore implémenté")
class TestUserListSerializer:
    """Tests pour le serializer de liste des utilisateurs"""
    
    def test_user_list_serialization(self, user):
        """Test de sérialisation de la liste des utilisateurs"""
        # Ce test sera implémenté quand le serializer sera créé
        pass
    
    def test_user_list_with_filters(self, user):
        """Test de sérialisation avec filtres"""
        # Ce test sera implémenté quand le serializer sera créé
        pass
