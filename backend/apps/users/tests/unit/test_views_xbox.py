import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.models import XboxProfile


@pytest.mark.django_db
class TestXboxDisconnectView:
    def test_disconnect_xbox_success(self, api_client, user):
        XboxProfile.objects.create(user=user, xbox_xuid="123456", gamertag="TestGamer")
        api_client.force_authenticate(user=user)

        url = reverse("xbox_disconnect")
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not XboxProfile.objects.filter(user=user).exists()

    def test_disconnect_xbox_not_linked(self, api_client, user):
        api_client.force_authenticate(user=user)

        url = reverse("xbox_disconnect")
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["detail"] == "Aucun compte Xbox n'est lié."

    def test_disconnect_xbox_unauthenticated(self, api_client):
        url = reverse("xbox_disconnect")
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
