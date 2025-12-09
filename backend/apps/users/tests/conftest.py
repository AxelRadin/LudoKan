"""
Fixtures pytest pour les tests de l'app users
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    """Client DRF simple sans authentification"""
    return APIClient()


@pytest.fixture
def sample_user_data():
    """Données utilisateur valides pour l'inscription"""
    return {
        "email": "testuser@example.com",
        "password1": "SuperPass123!",
        "password2": "SuperPass123!",
        "pseudo": "testuser",
        "first_name": "Test",
        "last_name": "User"
    }


@pytest.fixture
def user(db):
    """Créer un utilisateur existant dans la base de données"""
    from allauth.account.models import EmailAddress
    
    user = User.objects.create_user(
        email="existing@example.com",
        password="SuperPass123!",
        pseudo="existinguser",
        first_name="Existing",
        last_name="User"
    )
    
    # Marquer l'email comme vérifié
    EmailAddress.objects.create(
        user=user,
        email=user.email,
        verified=True,
        primary=True
    )
    
    return user


@pytest.fixture
def another_user(db):
    """Créer un deuxième utilisateur pour les tests de collision"""
    from allauth.account.models import EmailAddress
    
    user = User.objects.create_user(
        email="another@example.com",
        password="AnotherPass123!",
        pseudo="anotheruser"
    )
    
    # Marquer l'email comme vérifié
    EmailAddress.objects.create(
        user=user,
        email=user.email,
        verified=True,
        primary=True
    )
    
    return user


@pytest.fixture
def authenticated_api_client(user):
    """Client DRF avec authentification forcée (pour tests simples)"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def auth_client_with_tokens(api_client, user):
    """
    Client DRF avec authentification via login réel.
    Permet de tester refresh/logout avec cookies JWT réels.
    """
    login_url = "/api/auth/login/"
    response = api_client.post(
        login_url, 
        {"email": user.email, "password": "SuperPass123!"}, 
        format="json"
    )

    # Vérifier que le login a réussi
    assert response.status_code == 200, f"Login failed: {response.data}"
    
    # Mettre les cookies JWT dans le client
    if 'access_token' in response.cookies:
        api_client.cookies['access_token'] = response.cookies['access_token'].value
    if 'refresh_token' in response.cookies:
        api_client.cookies['refresh_token'] = response.cookies['refresh_token'].value
    
    return api_client


@pytest.fixture
def user_tokens(user):
    """Générer des tokens JWT pour un utilisateur"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@pytest.fixture
def api_client_with_token(api_client, user_tokens):
    """Client API avec token dans les cookies"""
    api_client.cookies['access_token'] = user_tokens['access']
    api_client.cookies['refresh_token'] = user_tokens['refresh']
    return api_client
