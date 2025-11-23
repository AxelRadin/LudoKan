"""
Tests pour les vues de l'app users
"""
import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.models import CustomUser


@pytest.mark.django_db
class TestRegisterView:
    def test_register_success(self, api_client, sample_user_data):
        url = reverse("register")
        response = api_client.post(url, sample_user_data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert "user" in response.data
        assert CustomUser.objects.filter(email=sample_user_data["email"]).exists()
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies


@pytest.mark.django_db
class TestLoginView:
    def test_login_success(self, api_client, user):
        url = reverse("login")
        response = api_client.post(url, {"email": user.email, "password": "SuperPass123!"}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies


@pytest.mark.django_db
class TestRefreshView:
    def test_refresh_success(self, auth_client_with_tokens):
        url = reverse("refresh")
        response = auth_client_with_tokens.post(url, {}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "refreshed"
        assert "access_token" in response.cookies


@pytest.mark.django_db
class TestLogoutView:
    def test_logout_success(self, auth_client_with_tokens):
        url = reverse("logout")
        response = auth_client_with_tokens.post(url, {}, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "logged out"
        assert response.cookies["access_token"].value == ""
        assert response.cookies["refresh_token"].value == ""
