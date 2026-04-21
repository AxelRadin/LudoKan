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


class SteamLoginCallbackViewTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test_steam_callback@example.com", pseudo="callback_tester", password="password123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("steam_callback")

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_success(self, mock_post, mock_delay):
        """
        Verify that a valid OpenID response from Steam correctly links the account
        and triggers the synchronization task.
        """
        # Mock Steam validation response
        mock_post.return_value.text = "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"
        mock_post.return_value.status_code = 200

        data = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "id_res",
            "openid.claimed_id": "https://steamcommunity.com/openid/id/76561198031542456",
            "openid.identity": "https://steamcommunity.com/openid/id/76561198031542456",
        }

        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["steam_id"], "76561198031542456")

        # Verify SteamProfile was created
        from apps.users.models import SteamProfile

        profile = SteamProfile.objects.get(user=self.user)
        self.assertEqual(profile.steam_id, "76561198031542456")

        # Verify sync task was triggered
        mock_delay.assert_called_once_with(self.user.id)

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_invalid(self, mock_post, mock_delay):
        """
        Verify that an invalid OpenID response from Steam is rejected and no sync task is triggered.
        """
        mock_post.return_value.text = "is_valid:false\n"

        data = {
            "openid.claimed_id": "https://steamcommunity.com/openid/id/76561198031542456",
        }

        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Échec de la validation", response.data["detail"])

        # Verify sync task was NOT triggered
        mock_delay.assert_not_called()

    def test_post_callback_missing_params(self):
        """
        Verify that missing parameters return 400.
        """
        response = self.client.post(self.url, data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SteamDisconnectViewTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test_steam_disco@example.com", pseudo="steam_disco", password="password123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("steam_disconnect")

    def test_disconnect_success(self):
        from apps.users.models import SteamProfile

        SteamProfile.objects.create(user=self.user, steam_id="12345")

        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.user.refresh_from_db()
        self.assertFalse(hasattr(self.user, "steam_profile"))

    def test_disconnect_not_found(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "Aucun compte Steam n'est lié.")

    def test_disconnect_unauthenticated(self):
        self.client.logout()
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
