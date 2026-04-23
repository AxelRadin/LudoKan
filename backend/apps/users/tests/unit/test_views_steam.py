from unittest.mock import patch

import requests
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import CustomUser, SteamProfile


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
        Ensure unauthenticated requests are now allowed (AllowAny).
        """
        self.client.logout()
        response = self.client.get(self.url)
        # La vue est publique depuis l'ajout de AllowAny
        self.assertEqual(response.status_code, status.HTTP_200_OK)

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

    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_steam_communication_error(self, mock_post):
        """
        Verify that a communication error with Steam returns 500.
        """
        mock_post.side_effect = requests.RequestException("Connexion échouée")
        data = {"openid.mode": "id_res", "openid.claimed_id": "some_id"}
        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Erreur de communication", response.data["detail"])

    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_invalid_claimed_id_format(self, mock_post):
        """
        Verify that an invalid claimed_id format returns 400.
        """
        mock_post.return_value.text = "is_valid:true"
        data = {
            "openid.mode": "id_res",
            "openid.claimed_id": "https://not-steam.com/id/123",
        }
        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("SteamID64 non trouvé", response.data["detail"])

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.get")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_new_unauthenticated_user_with_steam_summary(self, mock_post, mock_get, mock_delay):
        """
        When an unauthenticated user authenticates via Steam for the first time,
        a new CustomUser is created and Steam profile info is fetched.
        """
        mock_post.return_value.text = "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "response": {"players": [{"personaname": "SteamUser", "avatarfull": "https://example.com/avatar.jpg"}]}
        }

        self.client.logout()  # test as unauthenticated user
        data = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "id_res",
            "openid.claimed_id": "https://steamcommunity.com/openid/id/99999999999",
            "openid.identity": "https://steamcommunity.com/openid/id/99999999999",
        }
        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("is_new_user"))
        # Verify user was created with steam profile name
        from apps.users.models import CustomUser

        user = CustomUser.objects.filter(steam_profile__steam_id="99999999999").first()
        self.assertIsNotNone(user)
        self.assertEqual(user.pseudo, "SteamUser")

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_orphan_user_reused(self, mock_post, mock_delay):
        """
        If a fake-email user with the same steam ID exists but no SteamProfile,
        the existing user is reused instead of creating a new one (no IntegrityError).
        """
        from apps.users.models import CustomUser

        steam_id = "11111111111"
        fake_email = f"steam_{steam_id}@steam.ludokan.internal"
        CustomUser.objects.create_user(email=fake_email)

        mock_post.return_value.text = "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"
        self.client.logout()
        data = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "id_res",
            "openid.claimed_id": f"https://steamcommunity.com/openid/id/{steam_id}",
            "openid.identity": f"https://steamcommunity.com/openid/id/{steam_id}",
        }
        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # No duplicate user created
        self.assertEqual(CustomUser.objects.filter(email=fake_email).count(), 1)

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_existing_steam_profile_reuses_user(self, mock_post, mock_delay):
        """
        L139: When a SteamProfile already exists, the linked user is reused directly
        without creating a new one and is_new_user is False.
        """
        steam_id = "55555555555"
        SteamProfile.objects.create(user=self.user, steam_id=steam_id)

        mock_post.return_value.text = "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"

        data = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "id_res",
            "openid.claimed_id": f"https://steamcommunity.com/openid/id/{steam_id}",
            "openid.identity": f"https://steamcommunity.com/openid/id/{steam_id}",
        }
        response = self.client.post(self.url, data=data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data.get("is_new_user"))
        self.assertEqual(response.data["steam_id"], steam_id)

    @patch("apps.users.views_steam.sync_steam_library_task.delay")
    @patch("apps.users.views_steam.requests.get")
    @patch("apps.users.views_steam.requests.post")
    def test_post_callback_steam_summary_api_exception_is_handled(self, mock_post, mock_get, mock_delay):
        """
        L173-174: If the Steam GetPlayerSummaries call raises an exception,
        it is caught and logged — the overall response is still 200.
        """
        mock_post.return_value.text = "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n"
        mock_get.side_effect = Exception("Network error")

        self.client.logout()
        data = {
            "openid.ns": "http://specs.openid.net/auth/2.0",
            "openid.mode": "id_res",
            "openid.claimed_id": "https://steamcommunity.com/openid/id/77777777777",
            "openid.identity": "https://steamcommunity.com/openid/id/77777777777",
        }
        response = self.client.post(self.url, data=data, format="json")
        # Should succeed despite the Steam API error
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SteamDisconnectViewTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test_steam_disco@example.com", pseudo="steam_disco", password="password123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("steam_disconnect")

    def test_disconnect_success(self):

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
