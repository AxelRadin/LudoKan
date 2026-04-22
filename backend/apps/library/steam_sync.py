import datetime
import logging
from typing import List

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.games.igdb_client import igdb_request
from apps.games.igdb_proxy_constants import FIELDS_GAME_DETAIL
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

    # 5. Mettre à jour la date de dernière synchronisation

    user.steam_profile.last_sync_at = timezone.now()
    user.steam_profile.save(update_fields=["last_sync_at"])
    logger.info(f"Steam synchronization complete for user {user.pseudo}")


# Removed _extract_steam_appid as it is replaced by mapping


def _process_single_igdb_game(igdb_game: dict, igdb_id_to_steam: dict) -> None:
    igdb_id = igdb_game.get("id")
    if not igdb_id:
        return

    steam_appid = igdb_id_to_steam.get(igdb_id)
    if not steam_appid:
        return

    cover_url = None
    if igdb_game.get("cover") and isinstance(igdb_game["cover"], dict):
        cover_url = igdb_game["cover"].get("url")

    release_date = None
    if igdb_game.get("first_release_date"):
        release_date = datetime.date.fromtimestamp(igdb_game["first_release_date"])

    game, created = get_or_create_game_from_igdb(
        igdb_id=igdb_id,
        name=igdb_game.get("name"),
        cover_url=cover_url,
        summary=igdb_game.get("summary"),
        release_date=release_date,
        platforms=igdb_game.get("platforms"),
        genres=igdb_game.get("genres"),
        screenshots=igdb_game.get("screenshots"),
        videos=igdb_game.get("videos"),
    )

    if created or not game.steam_appid:
        game.steam_appid = steam_appid
        game.save(update_fields=["steam_appid"])


def _resolve_and_save_missing_games(appids: List[int]) -> None:
    if not appids:
        return

    # 1. Obtenir les IDs IGDB via l'endpoint external_games
    uid_conditions = " | ".join(f'uid="{appid}"' for appid in appids)
    ext_query = f"fields game,uid; where {uid_conditions}; limit {len(appids)};"

    try:
        ext_games = igdb_request("external_games", ext_query)
        if not isinstance(ext_games, list):
            ext_games = []
    except Exception as e:
        logger.error(f"IGDB external_games resolution error: {e}")
        return

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

    if not steam_to_igdb_id:
        logger.warning(f"Could not map any of the {len(appids)} Steam AppIDs to IGDB.")
        return

    igdb_id_to_steam = {v: k for k, v in steam_to_igdb_id.items()}

    # 2. Récupérer les données des jeux
    game_ids_str = ", ".join(str(gid) for gid in igdb_id_to_steam.keys())
    game_query = f"{FIELDS_GAME_DETAIL} where id = ({game_ids_str}); limit {len(igdb_id_to_steam)};"

    try:
        igdb_games = igdb_request("games", game_query)
        if not isinstance(igdb_games, list):
            igdb_games = []
        logger.info(f"IGDB request for {len(appids)} missing appids returned {len(igdb_games)} mapped games")
    except Exception as e:
        logger.error(f"IGDB games resolution error: {e}")
        return

    for igdb_game in igdb_games:
        _process_single_igdb_game(igdb_game, igdb_id_to_steam)
