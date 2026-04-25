import pytest

from apps.games.models import Game
from apps.library.models import UserGame, UserLibrary
from apps.library.services_collections import (
    attach_user_game_to_ma_ludotheque,
    attach_user_games_to_steam_collection,
    ensure_steam_collection,
    sync_steam_entries_for_matched_games,
)
from apps.users.models import SteamProfile


@pytest.mark.django_db
class TestServicesCollections:
    def test_ensure_steam_collection_returns_none_without_steam_profile(self, user):
        assert ensure_steam_collection(user) is None

    def test_attach_user_games_to_steam_collection_noops_without_steam_lib(self, user, game):
        ug = UserGame.objects.create(user=user, game=game)
        attach_user_games_to_steam_collection(user, [ug])

    def test_attach_user_games_skips_wrong_user_game(self, user, another_user, game):
        SteamProfile.objects.create(user=user, steam_id="76561198000000001")
        ug_other = UserGame.objects.create(user=another_user, game=game)
        attach_user_games_to_steam_collection(user, [ug_other])
        steam_lib = UserLibrary.objects.filter(user=user, system_key=UserLibrary.SystemKey.STEAM).first()
        assert steam_lib is not None
        assert not steam_lib.entries.filter(user_game=ug_other).exists()

    def test_sync_steam_entries_noops_on_empty_game_queryset(self, user):
        sync_steam_entries_for_matched_games(user, Game.objects.none())

    def test_attach_user_game_to_ma_ludotheque_creates_entry(self, user, game):
        ug = UserGame.objects.create(user=user, game=game)
        attach_user_game_to_ma_ludotheque(ug)
        ma = UserLibrary.objects.get(user=user, system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE)
        assert ma.entries.filter(user_game=ug).exists()
