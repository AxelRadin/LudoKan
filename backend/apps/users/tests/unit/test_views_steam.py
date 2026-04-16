from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import CustomUser


class SteamLoginInitiateViewTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test_steam_login@example.com", pseudo="steam_tester", password="password123")
        # Authentication is required for the view
        self.client.force_authenticate(user=self.user)
        self.url = reverse("steam_login_init")

    @override_settings(STEAM_REDIRECT_URL="https://ludokan.com/auth/steam/callback")
    def test_get_steam_login_url_success(self):
        """
        Verify that hitting the endpoint generates a proper auth_url for Steam OpenID.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("auth_url", response.data)

        auth_url = response.data["auth_url"]
        self.assertTrue(auth_url.startswith("https://steamcommunity.com/openid/login"))
        self.assertIn("openid.mode=checkid_setup", auth_url)

    def test_get_steam_login_url_unauthenticated(self):
        """
        Ensure unauthenticated requests are blocked.
        """
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("apps.users.views_steam.settings.STEAM_REDIRECT_URL", "")
    def test_get_steam_login_url_missing_redirect_url(self):
        """
        Verify that hitting the endpoint missing STEAM_REDIRECT_URL returns 500 error.
        """
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("manquante", response.data.get("detail", ""))
