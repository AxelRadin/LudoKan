import datetime
import logging
from typing import List

from allauth.socialaccount.models import SocialToken
from asgiref.sync import async_to_sync, sync_to_async
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from xbox.webapi.api.client import XboxLiveClient
from xbox.webapi.authentication.manager import AuthenticationManager
from xbox.webapi.authentication.models import OAuth2TokenResponse
from xbox.webapi.common.signed_session import SignedSession

from apps.games.igdb_client import igdb_request
from apps.games.igdb_proxy_constants import FIELDS_GAME_DETAIL
from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb
from apps.library.models import UserGame
from apps.library.services_collections import sync_xbox_entries_for_matched_games
from apps.users.models import CustomUser

logger = logging.getLogger("system_logs")


def sync_xbox_library(user: CustomUser) -> None:
    if not hasattr(user, "xbox_profile"):
        logger.warning(f"User {user.pseudo} has no linked Xbox profile.")
        return

    try:
        token = SocialToken.objects.get(account__user=user, account__provider="microsoft")
    except SocialToken.DoesNotExist:
        logger.error(f"User {user.pseudo} has no Microsoft OAuth token.")
        return

    async_to_sync(_async_sync_xbox_library)(user, token)


async def _async_sync_xbox_library(user: CustomUser, token: SocialToken) -> None:
    client_id = getattr(settings, "MICROSOFT_CLIENT_ID", "")
    client_secret = getattr(settings, "MICROSOFT_CLIENT_SECRET", "")

    # Reconstruire le token OAuth2 à partir du SocialToken allauth
    oauth_token = OAuth2TokenResponse(
        token_type="bearer",
        expires_in=3600,
        scope="XboxLive.signin offline_access",
        access_token=token.token,
        refresh_token=token.token_secret or "",
        user_id="",
        issued=timezone.now() - datetime.timedelta(minutes=5),
    )

    async with SignedSession() as session:
        auth_mgr = AuthenticationManager(session, client_id=client_id, client_secret=client_secret, redirect_uri="")
        auth_mgr.oauth = oauth_token

        try:
            await auth_mgr.request_user_token()
            await auth_mgr.request_xsts_token()
        except Exception as e:
            logger.error(f"Failed to authenticate with Xbox Live for user {user.pseudo}: {e}")
            return

        xuid = await sync_to_async(getattr)(user.xbox_profile, "xbox_xuid")
        client = XboxLiveClient(auth_mgr.user_token, auth_mgr.xsts_token)

        gamerscore = await sync_to_async(getattr)(user.xbox_profile, "gamerscore")
        try:
            profiles = await client.profile.get_profiles([xuid])
            if profiles and len(profiles) > 0:
                gamerscore = profiles[0].gamerscore
        except Exception as e:
            logger.error(f"Failed to fetch Xbox profile for user {user.pseudo}: {e}")

        try:
            title_history = await client.titlehub.get_title_history(xuid)
        except Exception as e:
            logger.error(f"Failed to fetch Xbox title history for user {user.pseudo}: {e}")
            return

    if not title_history or not title_history.titles:
        logger.warning(f"No Xbox titles found for user {user.pseudo}.")
        return

    titles_data = title_history.titles
    logger.info(f"Xbox API returned {len(titles_data)} games for user {user.pseudo}")

    titleid_to_playtime = {}
    for title in titles_data:
        tid = getattr(title, "title_id", None)
        if not tid:
            continue
        # Les jeux Xbox peuvent avoir du playtime, mais dans get_title_history ce n'est pas toujours direct.
        # Par défaut, nous utilisons 0 en attendant une meilleure intégration.
        titleid_to_playtime[str(tid)] = 0

    xbox_ids = list(titleid_to_playtime.keys())

    await sync_to_async(_process_xbox_db_operations)(user, xbox_ids, titleid_to_playtime, gamerscore)
    logger.info(f"Xbox synchronization complete for user {user.pseudo}")


def _process_xbox_db_operations(user: CustomUser, xbox_ids: List[str], titleid_to_playtime: dict, gamerscore: int) -> None:
    existing_games = list(Game.objects.filter(xbox_id__in=xbox_ids))
    existing_ids = {game.xbox_id for game in existing_games}
    logger.info(f"Found {len(existing_games)} games already in local DB out of {len(xbox_ids)}")

    missing_ids = [tid for tid in xbox_ids if tid not in existing_ids]
    logger.info(f"Missing {len(missing_ids)} games to fetch from IGDB")

    chunk_size = 50
    for i in range(0, len(missing_ids), chunk_size):
        chunk = missing_ids[i : i + chunk_size]
        _resolve_and_save_missing_games(chunk)

    all_matched_games = Game.objects.filter(xbox_id__in=xbox_ids)
    logger.info(f"Total matched games in DB ready to map: {all_matched_games.count()} out of {len(xbox_ids)}")

    with transaction.atomic():
        for game in all_matched_games:
            playtime_hours = titleid_to_playtime.get(game.xbox_id, 0)
            user_game, created = UserGame.objects.get_or_create(user=user, game=game)
            if not created and playtime_hours > user_game.playtime_forever:
                user_game.playtime_forever = playtime_hours
                user_game.save(update_fields=["playtime_forever", "date_modified"])

        sync_xbox_entries_for_matched_games(user, all_matched_games)

    user.xbox_profile.gamerscore = gamerscore
    user.xbox_profile.last_sync_at = timezone.now()
    user.xbox_profile.save(update_fields=["last_sync_at", "gamerscore"])


def _process_single_igdb_game(igdb_game: dict, igdb_id_to_xbox: dict) -> None:
    igdb_id = igdb_game.get("id")
    if not igdb_id:
        return

    xbox_id = igdb_id_to_xbox.get(igdb_id)
    if not xbox_id:
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

    if created or not game.xbox_id:
        game.xbox_id = xbox_id
        game.save(update_fields=["xbox_id"])


def _fetch_external_games(xbox_ids: List[str]) -> list[dict]:
    # Category 6 is for Xbox Live in IGDB external_games
    uid_conditions = ",".join(f'"{tid}"' for tid in xbox_ids)
    ext_query = f"fields game,uid; where category = 6 & uid = ({uid_conditions}); limit 500;"

    try:
        ext_games = igdb_request("external_games", ext_query)
        if not isinstance(ext_games, list):
            return []
        return ext_games
    except Exception as e:
        logger.error(f"IGDB external_games resolution error (Xbox): {e}")
        return []


def _map_xbox_to_igdb(ext_games: list[dict]) -> dict:
    xbox_to_igdb_id = {}
    for ext in ext_games:
        game_id = ext.get("game")
        if isinstance(game_id, dict):
            game_id = game_id.get("id")
        uid = ext.get("uid")
        if game_id and uid and uid not in xbox_to_igdb_id:
            xbox_to_igdb_id[uid] = game_id
    return xbox_to_igdb_id


def _fetch_igdb_games_by_ids(igdb_ids: list[int]) -> list[dict]:
    game_ids_str = ", ".join(str(gid) for gid in igdb_ids)
    game_query = f"{FIELDS_GAME_DETAIL} where id = ({game_ids_str}); limit {len(igdb_ids)};"

    try:
        igdb_games = igdb_request("games", game_query)
        if not isinstance(igdb_games, list):
            return []
        return igdb_games
    except Exception as e:
        logger.error(f"IGDB games resolution error: {e}")
        return []


def _resolve_and_save_missing_games(xbox_ids: List[str]) -> None:
    if not xbox_ids:
        return

    ext_games = _fetch_external_games(xbox_ids)
    xbox_to_igdb_id = _map_xbox_to_igdb(ext_games)

    if not xbox_to_igdb_id:
        logger.warning(f"Could not map any of the {len(xbox_ids)} Xbox Title IDs to IGDB.")
        return

    igdb_id_to_xbox = {v: k for k, v in xbox_to_igdb_id.items()}
    igdb_games = _fetch_igdb_games_by_ids(list(igdb_id_to_xbox.keys()))

    if igdb_games:
        logger.info(f"IGDB request for {len(xbox_ids)} missing xbox_ids returned {len(igdb_games)} mapped games")

    for igdb_game in igdb_games:
        _process_single_igdb_game(igdb_game, igdb_id_to_xbox)
