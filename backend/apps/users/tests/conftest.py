import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    """Client DRF simple"""
    return APIClient()


@pytest.fixture
def sample_user_data():
    """Données utilisateur valides pour l'inscription"""
    return {
        "email": "testuser@example.com",
        "password": "SuperPass123!",
        "pseudo": "testuser"
    }


@pytest.fixture
def user(db):
    """Créer un utilisateur existant"""
    return User.objects.create_user(
        email="existing@example.com",
        password="SuperPass123!",
        pseudo="existinguser"
    )


@pytest.fixture
def authenticated_api_client(user):
    """Client DRF avec authentification forcée"""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def auth_client_with_tokens(api_client, user):
    """
    Client DRF avec authentification via login réel.
    Permet de tester refresh/logout avec cookies JWT.
    """
    login_url = "/api/auth/login/"  # ou reverse('login') si les noms sont corrects
    response = api_client.post(login_url, {"email": user.email, "password": "SuperPass123!"}, format="json")

    # On met les cookies JWT dans le client
    api_client.cookies['access_token'] = response.cookies['access_token'].value
    api_client.cookies['refresh_token'] = response.cookies['refresh_token'].value
    return api_client
