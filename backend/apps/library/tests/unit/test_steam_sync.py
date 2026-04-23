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
        def mock_igdb_backend(endpoint, query):
            if endpoint == "external_games":
                return [{"uid": "400", "game": {"id": 72}}]
            return [
                {
                    "id": 72,
                    "name": "Portal",
                    "summary": "A puzzle game.",
                }
            ]

        mock_igdb.side_effect = mock_igdb_backend

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

    def test_sync_steam_library_no_steam_profile(self):
        user_no_profile = CustomUser.objects.create_user(email="no@ludo.com", pseudo="noprofile", password="pwd")
        sync_steam_library(user_no_profile)  # Should exit cleanly

    def test_sync_steam_library_no_api_key(self):
        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", ""):
            sync_steam_library(self.user)  # Should exit cleanly

    @patch("apps.library.steam_sync.requests.get")
    def test_sync_steam_library_request_exception(self, mock_get):
        mock_get.side_effect = Exception("Network error")
        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", "fake_key"):
            sync_steam_library(self.user)  # Should catch and return

    @patch("apps.library.steam_sync.requests.get")
    def test_sync_steam_library_no_games(self, mock_get):
        mock_response = mock_get.return_value
        mock_response.json.return_value = {"response": {}}
        mock_response.raise_for_status.return_value = None
        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", "fake_key"):
            sync_steam_library(self.user)  # Should exit cleanly without creating anything

    @patch("apps.library.steam_sync.requests.get")
    def test_sync_steam_library_update_playtime(self, mock_get):
        portal_game = Game.objects.create(name="Portal", steam_appid=400, igdb_id=72, publisher=self.publisher)
        user_game = UserGame.objects.create(user=self.user, game=portal_game, playtime_forever=1.0)

        mock_response = mock_get.return_value
        mock_response.json.return_value = {"response": {"game_count": 1, "games": [{"appid": 400, "playtime_forever": 120}]}}  # 120 mins = 2.0 hrs
        mock_response.raise_for_status.return_value = None

        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", "fake_key"):
            sync_steam_library(self.user)

        user_game.refresh_from_db()
        self.assertEqual(user_game.playtime_forever, 2.0, "Le temps devrait être mis à jour.")

    def test_resolve_missing_games_empty(self):
        _resolve_and_save_missing_games([])  # Should return cleanly

    @patch("apps.library.steam_sync.igdb_request")
    def test_resolve_missing_games_igdb_exception(self, mock_igdb):
        mock_igdb.side_effect = Exception("IGDB Error")
        _resolve_and_save_missing_games([400])  # Should catch and return cleanly

    @patch("apps.library.steam_sync.igdb_request")
    def test_resolve_missing_games_invalid_data(self, mock_igdb):
        def mock_igdb_backend(endpoint, query):
            if endpoint == "external_games":
                return [{"uid": "888", "game": {"id": 888}}, {"uid": "100"}]
            return [
                {"name": "No ID"},  # missing ID
                {"id": 9999, "name": "Unmapped ID"},  # Unmapped ID
                {
                    "id": 888,
                    "name": "Cover Test",
                    "cover": {"url": "http://cover"},
                    "first_release_date": 1609459200,
                },
            ]

        mock_igdb.side_effect = mock_igdb_backend

        _resolve_and_save_missing_games([888])
        game = Game.objects.filter(steam_appid=888).first()
        self.assertIsNotNone(game)
        self.assertEqual(game.cover_url, "http://cover")

    @patch("apps.library.steam_sync.igdb_request")
    def test_resolve_missing_games_not_list(self, mock_igdb):
        # mock non list return for external_games
        mock_igdb.return_value = {"error": "not a list"}
        _resolve_and_save_missing_games([100])  # should default to [] and not crash

    @patch("apps.library.steam_sync.igdb_request")
    def test_resolve_missing_games_games_not_list(self, mock_igdb):
        def mock_igdb_backend(endpoint, query):
            if endpoint == "external_games":
                return [{"uid": "100", "game": {"id": 100}}]
            return {"error": "not a list"}

        mock_igdb.side_effect = mock_igdb_backend
        _resolve_and_save_missing_games([100])  # should default to [] and not crash

    @patch("apps.library.steam_sync.igdb_request")
    def test_resolve_missing_games_games_exception(self, mock_igdb):
        def mock_igdb_backend(endpoint, query):
            if endpoint == "external_games":
                return [{"uid": "100", "game": {"id": 100}}]
            raise Exception("Games IGDB Error")

        mock_igdb.side_effect = mock_igdb_backend
        _resolve_and_save_missing_games([100])  # should catch and return cleanly

    @patch("apps.library.steam_sync.igdb_request")
    @patch("apps.library.steam_sync.requests.get")
    def test_sync_steam_library_with_missing_game(self, mock_get, mock_igdb):
        mock_response = mock_get.return_value
        mock_response.json.return_value = {"response": {"game_count": 1, "games": [{"appid": 500, "playtime_forever": 60}]}}
        mock_response.raise_for_status.return_value = None

        def mock_igdb_backend(endpoint, query):
            if endpoint == "external_games":
                return [{"uid": "500", "game": {"id": 99}}]
            return [{"id": 99, "name": "Missing Game"}]

        mock_igdb.side_effect = mock_igdb_backend

        with patch("apps.library.steam_sync.settings.STEAM_API_KEY", "fake_key"):
            sync_steam_library(self.user)

        user_game = UserGame.objects.filter(user=self.user, game__steam_appid=500).first()
        self.assertIsNotNone(user_game)
        self.assertEqual(user_game.playtime_forever, 1.0)
