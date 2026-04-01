from datetime import date
from typing import Optional

from apps.games.models import Game, Genre, Platform, Publisher


def get_or_create_game_from_igdb(
    *,
    igdb_id: int,
    name: Optional[str] = None,
    cover_url: Optional[str] = None,
    release_date: Optional[date] = None,
    summary: Optional[str] = None,
    platforms: Optional[list[dict]] = None,
    genres: Optional[list[dict]] = None,
) -> tuple[Game, bool]:
    """
    Centralized logic to dynamically resolve or create an IGDB game in the local database.
    This aims to be the single source of truth for converting IGDB games to Django Games.
    """
    publisher, _ = Publisher.objects.get_or_create(
        name="IGDB",
        defaults={"description": "Jeux importés depuis IGDB"},
    )

    defaults = {"publisher": publisher}

    if name is not None:
        defaults["name"] = name
    if cover_url is not None:
        defaults["cover_url"] = cover_url
    if release_date is not None:
        defaults["release_date"] = release_date
    if summary is not None:
        defaults["description"] = summary

    if "name" not in defaults:
        defaults["name"] = f"Unknown Game ({igdb_id})"

    game, created = Game.objects.get_or_create(
        igdb_id=igdb_id,
        defaults=defaults,
    )

    if not created:
        # Healing Strategy: If the game already exists but is a "stub" (missing metadata),
        # update it with the provided info.
        update_fields = []
        if not game.description and summary:
            game.description = summary
            update_fields.append("description")
        if not game.cover_url and cover_url:
            game.cover_url = cover_url
            update_fields.append("cover_url")
        if not game.release_date and release_date:
            game.release_date = release_date
            update_fields.append("release_date")
        if name and (not game.name or game.name.startswith("Unknown Game")):
            game.name = name
            update_fields.append("name")

        if update_fields:
            game.save(update_fields=update_fields)

    # If platforms or genres are provided, ensure they are linked
    if platforms:
        for p_data in platforms:
            p_id = p_data.get("id")
            p_name = p_data.get("name")
            if p_name:
                p_obj, _ = Platform.objects.get_or_create(
                    igdb_id=p_id,
                    defaults={"name": p_name},
                )
                game.platforms.add(p_obj)

    if genres:
        for g_data in genres:
            g_id = g_data.get("id")
            g_name = g_data.get("name")
            if g_name:
                g_obj, _ = Genre.objects.get_or_create(
                    igdb_id=g_id,
                    defaults={"name": g_name},
                )
                game.genres.add(g_obj)

    return game, created
