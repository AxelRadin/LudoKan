"""
Tests pour les vues de l'app users
"""
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.skip(reason="Vue pas encore implémentée")
class TestUserRegistrationView:
    """Tests pour la vue d'inscription"""
    
    def test_user_registration_success(self, api_client, sample_user_data):
        """Test d'inscription réussie"""
        url = reverse('user-register')  # Sera défini quand les URLs seront créées
        
        response = api_client.post(url, sample_user_data)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_user_registration_invalid_data(self, api_client):
        """Test d'inscription avec des données invalides"""
        url = reverse('user-register')
        invalid_data = {
            'username': '',
            'email': 'invalid-email',
            'password': '123'  # Trop court
        }
        
        response = api_client.post(url, invalid_data)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
@pytest.mark.skip(reason="Vue pas encore implémentée")
class TestUserLoginView:
    """Tests pour la vue de connexion"""
    
    def test_user_login_success(self, api_client, user):
        """Test de connexion réussie"""
        url = reverse('user-login')
        login_data = {
            'username': user.username,
            'password': 'testpass123'
        }
        
        response = api_client.post(url, login_data)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_200_OK
    
    def test_user_login_invalid_credentials(self, api_client):
        """Test de connexion avec des identifiants invalides"""
        url = reverse('user-login')
        invalid_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword'
        }
        
        response = api_client.post(url, invalid_data)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
@pytest.mark.skip(reason="Vue pas encore implémentée")
class TestUserProfileView:
    """Tests pour la vue de profil utilisateur"""
    
    def test_get_user_profile_authenticated(self, authenticated_api_client, user):
        """Test de récupération du profil utilisateur authentifié"""
        url = reverse('user-profile')
        
        response = authenticated_api_client.get(url)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_200_OK
    
    def test_get_user_profile_unauthenticated(self, api_client):
        """Test de récupération du profil sans authentification"""
        url = reverse('user-profile')
        
        response = api_client.get(url)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_user_profile(self, authenticated_api_client, user):
        """Test de mise à jour du profil utilisateur"""
        url = reverse('user-profile')
        update_data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        
        response = authenticated_api_client.patch(url, update_data)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
@pytest.mark.skip(reason="Vue pas encore implémentée")
class TestUserListView:
    """Tests pour la vue de liste des utilisateurs"""
    
    def test_list_users_authenticated(self, authenticated_api_client):
        """Test de liste des utilisateurs pour utilisateur authentifié"""
        url = reverse('user-list')
        
        response = authenticated_api_client.get(url)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_200_OK
    
    def test_list_users_unauthenticated(self, api_client):
        """Test de liste des utilisateurs sans authentification"""
        url = reverse('user-list')
        
        response = api_client.get(url)
        
        # Ce test sera implémenté quand la vue sera créée
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
