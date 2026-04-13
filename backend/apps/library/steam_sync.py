import logging
from typing import List

import requests
from django.conf import settings
from django.db import transaction

from apps.games.igdb_client import igdb_request
from apps.games.igdb_proxy_constants import FIELDS_GAMES_LIST
from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb
from apps.library.models import UserGame
from apps.users.models import CustomUser

logger = logging.getLogger("system_logs")

STEAM_API_BASE_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/"


def sync_steam_library(user: CustomUser) -> None:
    if not hasattr(user, "steam_profile"):
        logger.warning(f"User {user.pseudo} has no linked Steam profile.")
        return

    steam_id = user.steam_profile.steam_id
    api_key = settings.STEAM_API_KEY
    if not api_key:
        logger.error("STEAM_API_KEY is missing from settings.")
        return

    try:
        response = requests.get(
            STEAM_API_BASE_URL,
            params={
                "key": api_key,
                "steamid": steam_id,
                "include_appinfo": 1,
                "include_played_free_games": 1,
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        logger.error(f"Failed to fetch Steam library for user {user.pseudo}: {e}")
        return

    games_data = data.get("response", {}).get("games", [])
    if not games_data:
        return

    appids_to_playtime = {int(game["appid"]): int(game.get("playtime_forever", 0)) for game in games_data}
    steam_appids = list(appids_to_playtime.keys())

    # 1. Match with existing games in DB using steam_appid
    existing_games = list(Game.objects.filter(steam_appid__in=steam_appids))
    existing_appids = {game.steam_appid for game in existing_games}

    missing_appids = [appid for appid in steam_appids if appid not in existing_appids]

    # 2. Fetch missing games in chunks from IGDB
    chunk_size = 50
    for i in range(0, len(missing_appids), chunk_size):
        chunk = missing_appids[i : i + chunk_size]
        _resolve_and_save_missing_games(chunk)

    # 3. Reload all matched games (some missing ones are now created)
    all_matched_games = Game.objects.filter(steam_appid__in=steam_appids)

    # 4. Map to UserGame and update playtimes
    with transaction.atomic():
        for game in all_matched_games:
            playtime_minutes = appids_to_playtime.get(game.steam_appid, 0)
            playtime_hours = round(playtime_minutes / 60.0, 2)

            user_game, created = UserGame.objects.get_or_create(user=user, game=game, defaults={"playtime_forever": playtime_hours})
            # update playtime if it's greater
            if not created and playtime_hours > user_game.playtime_forever:
                user_game.playtime_forever = playtime_hours
                user_game.save(update_fields=["playtime_forever", "date_modified"])


def _resolve_and_save_missing_games(appids: List[int]) -> None:
    if not appids:
        return

    uid_list = ", ".join(f'"{appid}"' for appid in appids)
    # Include external_games array to parse the steam appid back via category 1
    query = (
        f"{FIELDS_GAMES_LIST},external_games.category,external_games.uid "
        f"where external_games.category = 1 & external_games.uid = ({uid_list}); "
        f"limit {len(appids)};"
    )

    try:
        igdb_games = igdb_request("games", query)
        if not isinstance(igdb_games, list):
            igdb_games = []
    except Exception as e:
        logger.error(f"IGDB Steam AppID resolution error: {e}")
        return

    for igdb_game in igdb_games:
        igdb_id = igdb_game.get("id")
        if not igdb_id:
            continue

        steam_appid = None
        ext_games = igdb_game.get("external_games", [])
        for ex in ext_games:
            if ex.get("category") == 1:
                uid = ex.get("uid")
                if uid and uid.isdigit():
                    steam_appid = int(uid)
                    break

        if not steam_appid:
            continue

        cover_url = None
        if igdb_game.get("cover") and isinstance(igdb_game["cover"], dict):
            cover_url = igdb_game["cover"].get("url")

        game, created = get_or_create_game_from_igdb(
            igdb_id=igdb_id,
            name=igdb_game.get("name"),
            cover_url=cover_url,
            summary=igdb_game.get("summary"),
            platforms=igdb_game.get("platforms"),
        )

        if created or not game.steam_appid:
            game.steam_appid = steam_appid
            game.save(update_fields=["steam_appid"])
