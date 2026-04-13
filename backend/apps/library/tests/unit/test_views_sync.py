from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import CustomUser


class SteamSyncViewTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="test_sync@example.com", pseudo="sync_tester", password="password123")
        self.url = reverse("library:sync-steam")

    @patch("apps.library.views.sync_steam_library_task.delay")
    def test_sync_steam_triggers_celery_task(self, mock_delay):
        """
        Vérifie que le point d'accès déclenche bien la tâche Celery asynchrone
        et renvoie le statut HTTP 202 Accepted.
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        mock_delay.assert_called_once_with(self.user.id)
        self.assertIn("file d'attente", response.data.get("detail", ""))

    def test_sync_steam_requires_authentication(self):
        """
        Vérifie que seuls les utilisateurs authentifiés peuvent lancer la synchro.
        """
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("apps.library.views.sync_steam_library_task.delay")
    def test_sync_steam_throttling(self, mock_delay):
        """
        Vérifie que la limitation de taux (1/min) est bien appliquée sur cette vue.
        """
        # Pour les tests, le cache utilisé pour les throttles est effacé par défaut, mais
        # on peut s'assurer que 2 appels successifs bloquent le deuxième.
        self.client.force_authenticate(user=self.user)

        # Premier appel (doit passer)
        response_1 = self.client.post(self.url)
        self.assertEqual(response_1.status_code, status.HTTP_202_ACCEPTED)

        # Deuxième appel immédiat (doit être throttlé car limité à 1/minute)
        response_2 = self.client.post(self.url)
        self.assertEqual(response_2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
