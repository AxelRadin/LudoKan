from datetime import date
from typing import Optional

from apps.games.models import Game, Genre, Platform, Publisher


def _get_igdb_publisher() -> Publisher:
    """Helper to fetch the standard IGDB publisher."""
    publisher, _ = Publisher.objects.get_or_create(
        name="IGDB",
        defaults={"description": "Jeux importés depuis IGDB"},
    )
    return publisher


def _build_game_defaults(
    publisher: Publisher,
    igdb_id: int,
    name: Optional[str] = None,
    cover_url: Optional[str] = None,
    release_date: Optional[date] = None,
    summary: Optional[str] = None,
) -> dict:
    """Build the defaults dictionary for game creation."""
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

    return defaults


def _heal_game_metadata(
    game: Game,
    name: Optional[str] = None,
    cover_url: Optional[str] = None,
    release_date: Optional[date] = None,
    summary: Optional[str] = None,
) -> None:
    """Update fields on an existing game if they are missing (Stub Healing)."""
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


def _link_igdb_platforms(game: Game, platforms: list[dict]) -> None:
    """Create platforms if needed and link them to the game."""
    for p_data in platforms:
        p_id = p_data.get("id")
        p_name = p_data.get("name")
        if p_name:
            p_obj, _ = Platform.objects.get_or_create(
                igdb_id=p_id,
                defaults={"name": p_name},
            )
            game.platforms.add(p_obj)


def _link_igdb_genres(game: Game, genres: list[dict]) -> None:
    """Create genres if needed and link them to the game."""
    for g_data in genres:
        g_id = g_data.get("id")
        g_name = g_data.get("name")
        if g_name:
            g_obj, _ = Genre.objects.get_or_create(
                igdb_id=g_id,
                defaults={"name": g_name},
            )
            game.genres.add(g_obj)


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
    publisher = _get_igdb_publisher()

    defaults = _build_game_defaults(
        publisher=publisher,
        igdb_id=igdb_id,
        name=name,
        cover_url=cover_url,
        release_date=release_date,
        summary=summary,
    )

    game, created = Game.objects.get_or_create(
        igdb_id=igdb_id,
        defaults=defaults,
    )

    if not created:
        _heal_game_metadata(
            game=game,
            name=name,
            cover_url=cover_url,
            release_date=release_date,
            summary=summary,
        )

    if platforms:
        _link_igdb_platforms(game, platforms)

    if genres:
        _link_igdb_genres(game, genres)

    return game, created
