from unittest.mock import patch

from django.test import TestCase

from apps.games.models import Game, Publisher
from apps.library.models import UserGame
from apps.library.steam_sync import _resolve_and_save_missing_games, sync_steam_library
from apps.users.models import CustomUser, SteamProfile


class SteamSyncTest(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(email="portal_tester@ludokan.com", pseudo="portal_tester", password="password")
        self.steam_profile = SteamProfile.objects.create(user=self.user, steam_id="76561198031200000")
        self.publisher = Publisher.objects.create(name="Valve")

    @patch("apps.library.steam_sync.igdb_request")
    def test_steam_id_400_to_portal_game(self, mock_igdb):
        """
        Acceptance criteria: 'Une fonction de test peut transformer l'ID Steam 400 en l'objet Jeu Portal dans ta base.'
        We test the resolution function directly for appid 400.
        """
        # Mock IGDB response for Portal
        mock_igdb.return_value = [
            {
                "id": 72,
                "name": "Portal",
                "summary": "A puzzle game.",
                "external_games": [{"category": 1, "uid": "400"}, {"category": 5, "uid": "portal"}],
            }
        ]

        # Portal is appid 400
        _resolve_and_save_missing_games([400])

        portal_game = Game.objects.filter(steam_appid=400).first()

        self.assertIsNotNone(portal_game, "Le jeu avec le steam_appid 400 devrait avoir été créé.")
        self.assertIn("Portal", portal_game.name, "Le jeu créé devrait s'appeler Portal.")

    @patch("apps.library.steam_sync.requests.get")
    def test_steam_playtime_conversion(self, mock_get):
        """
        Acceptance criteria: 'Le temps de jeu est correctement converti de minutes (Steam) en heures (LudoKan).'
        We mock the steam API response for Portal (400) having 180 minutes of play.
        """
        # Ensure the Game object already exists to avoid calling IGDB during this test
        portal_game = Game.objects.create(name="Portal", steam_appid=400, igdb_id=72, publisher=self.publisher)  # IGDB id for portal

        mock_response = mock_get.return_value
        mock_response.json.return_value = {"response": {"game_count": 1, "games": [{"appid": 400, "playtime_forever": 180}]}}  # 3 hours
        mock_response.raise_for_status.return_value = None

        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", "fake_key"):
            sync_steam_library(self.user)

        user_game = UserGame.objects.filter(user=self.user, game=portal_game).first()
        self.assertIsNotNone(user_game, "Le lien UserGame devrait avoir été créé.")

        # 180 minutes = 3.0 hours
        self.assertEqual(user_game.playtime_forever, 3.0, "Le temps de jeu devrait être de 3.0 heures.")
