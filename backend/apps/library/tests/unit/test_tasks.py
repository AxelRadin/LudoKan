from unittest.mock import patch

from django.test import TestCase

from apps.library.tasks import sync_steam_library_task
from apps.users.models import CustomUser


class SyncSteamLibraryTaskTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="task_tester@ludokan.com", pseudo="task_tester", password="password123")

    @patch("apps.library.tasks.sync_steam_library")
    def test_sync_steam_library_task_success(self, mock_sync):
        """
        Vérifie que la tâche appelle bien sync_steam_library lorsque l'utilisateur existe.
        """
        sync_steam_library_task(self.user.id)
        mock_sync.assert_called_once_with(self.user)

    @patch("apps.library.tasks.sync_steam_library")
    def test_sync_steam_library_task_user_not_found(self, mock_sync):
        """
        Vérifie que la tâche ignore silencieusement les ID d'utilisateurs inexistants.
        """
        sync_steam_library_task(999999)
        mock_sync.assert_not_called()

    @patch("apps.library.tasks.sync_steam_library")
    def test_sync_steam_library_task_exception(self, mock_sync):
        """
        Vérifie que les exceptions sont interceptées.
        """
        mock_sync.side_effect = Exception("Crash")
        # Ne doit pas lever d'exception
        sync_steam_library_task(self.user.id)
        mock_sync.assert_called_once()
