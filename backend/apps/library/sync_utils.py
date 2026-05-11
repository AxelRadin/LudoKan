import datetime
import logging
from typing import List

from apps.games.igdb_client import igdb_request
from apps.games.igdb_proxy_constants import FIELDS_GAME_DETAIL
from apps.games.services import get_or_create_game_from_igdb

logger = logging.getLogger("system_logs")


def fetch_external_games(platform_ids: List[str], category: int) -> list[dict]:
    uid_conditions = ",".join(f'"{pid}"' for pid in platform_ids)
    ext_query = f"fields game,uid; where category = {category} & uid = ({uid_conditions}); limit 500;"

    try:
        ext_games = igdb_request("external_games", ext_query)
        if not isinstance(ext_games, list):
            return []
        return ext_games
    except Exception as e:
        logger.error(f"IGDB external_games resolution error (category {category}): {e}")
        return []


def fetch_igdb_games_by_ids(igdb_ids: list[int]) -> list[dict]:
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


def process_single_igdb_game(igdb_game: dict, external_id: str | int, platform_field: str) -> None:
    igdb_id = igdb_game.get("id")
    if not igdb_id:
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

    if created or not getattr(game, platform_field):
        setattr(game, platform_field, external_id)
        game.save(update_fields=[platform_field])
