import logging
from typing import List

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.games.models import Game
from apps.library.models import UserGame
from apps.library.services_collections import sync_steam_entries_for_matched_games
from apps.library.sync_utils import fetch_external_games, fetch_igdb_games_by_ids, process_single_igdb_game
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
        logger.exception(f"Failed to fetch Steam library for user {user.pseudo}: {e}")
        return

    games_data = data.get("response", {}).get("games", [])
    if not games_data:
        logger.warning(f"No games found on Steam for user {user.pseudo}. Check if 'Game details' are public in Steam Privacy Settings.")
        return

    logger.info(f"Steam API returned {len(games_data)} games for user {user.pseudo}")

    appids_to_playtime = {int(game["appid"]): int(game.get("playtime_forever", 0)) for game in games_data}
    steam_appids = list(appids_to_playtime.keys())

    # 1. Match with existing games in DB using steam_appid
    existing_games = list(Game.objects.filter(steam_appid__in=steam_appids))
    existing_appids = {game.steam_appid for game in existing_games}
    logger.info(f"Found {len(existing_games)} games already in local DB out of {len(steam_appids)}")

    missing_appids = [appid for appid in steam_appids if appid not in existing_appids]
    logger.info(f"Missing {len(missing_appids)} games to fetch from IGDB")

    # 2. Fetch missing games in chunks from IGDB
    chunk_size = 50
    for i in range(0, len(missing_appids), chunk_size):
        chunk = missing_appids[i : i + chunk_size]
        _resolve_and_save_missing_games(chunk)

    # 3. Reload all matched games (some missing ones are now created)
    all_matched_games = Game.objects.filter(steam_appid__in=steam_appids)
    logger.info(f"Total matched games in DB ready to map: {all_matched_games.count()} out of {len(steam_appids)}")

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

        sync_steam_entries_for_matched_games(user, all_matched_games)

    # 5. Mettre à jour la date de dernière synchronisation

    user.steam_profile.last_sync_at = timezone.now()
    user.steam_profile.save(update_fields=["last_sync_at"])
    logger.info(f"Steam synchronization complete for user {user.pseudo}")


# Removed _extract_steam_appid as it is replaced by mapping


def _map_steam_to_igdb(ext_games: list[dict]) -> dict:
    steam_to_igdb_id = {}
    for ext in ext_games:
        game_id = ext.get("game")
        if isinstance(game_id, dict):
            game_id = game_id.get("id")
        uid = ext.get("uid")
        if game_id and uid and uid.isdigit():
            appid = int(uid)
            if appid not in steam_to_igdb_id:
                steam_to_igdb_id[appid] = game_id
    return steam_to_igdb_id


def _resolve_and_save_missing_games(appids: List[int]) -> None:
    if not appids:
        return

    ext_games = fetch_external_games(appids, category=1)
    steam_to_igdb_id = _map_steam_to_igdb(ext_games)

    if not steam_to_igdb_id:
        logger.warning(f"Could not map any of the {len(appids)} Steam AppIDs to IGDB.")
        return

    igdb_id_to_steam = {v: k for k, v in steam_to_igdb_id.items()}
    igdb_games = fetch_igdb_games_by_ids(list(igdb_id_to_steam.keys()))

    if igdb_games:
        logger.info(f"IGDB request for {len(appids)} missing appids returned {len(igdb_games)} mapped games")

    for igdb_game in igdb_games:
        external_id = igdb_id_to_steam.get(igdb_game.get("id"))
        if external_id:
            process_single_igdb_game(igdb_game, external_id, "steam_appid")
