from datetime import date
from typing import Optional

from apps.games.models import Game, Publisher


def get_or_create_game_from_igdb(
    *,
    igdb_id: int,
    name: Optional[str] = None,
    cover_url: Optional[str] = None,
    release_date: Optional[date] = None,
) -> tuple[Game, bool]:
    """
    Centralized logic to dynamically resolve or create an IGDB game in the local database.
    This aims to be the single source of truth for converting IGDB games to Django Games.
    """
    publisher, _ = Publisher.objects.get_or_create(
        name="IGDB",
        defaults={"description": "Jeux importés depuis IGDB"},
    )

    # Use defaults so we don't accidentally overwrite data if the game already exists
    # If the game exists but missing fields, a different update logic might be needed later,
    # but for resolution with get_or_create, this is idempotent.
    defaults = {"publisher": publisher}

    if name is not None:
        defaults["name"] = name
    if cover_url is not None:
        defaults["cover_url"] = cover_url
    if release_date is not None:
        defaults["release_date"] = release_date

    # If the user doesn't provide a name and the game is created for the first time,
    # name will be empty string as fallback to satisfy the DB constraint.
    # Usually `name` string is mandatory in the model if not null=True.
    if "name" not in defaults:
        defaults["name"] = f"Unknown Game ({igdb_id})"

    game, created = Game.objects.get_or_create(
        igdb_id=igdb_id,
        defaults=defaults,
    )

    return game, created
