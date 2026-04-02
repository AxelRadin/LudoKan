from datetime import datetime
from typing import Any

from apps.games.models import Game, Rating
from apps.library.models import UserGame


def _extract_release_date(first_release_date: Any) -> str | None:
    if first_release_date is not None:
        try:
            # first_release_date est un timestamp UNIX
            return datetime.fromtimestamp(first_release_date).strftime("%Y-%m-%d")
        except Exception:
            pass
    return None


def _extract_cover_url(cover: Any) -> str | None:
    if isinstance(cover, dict):
        url = cover.get("url")
        if isinstance(url, str):
            if url.startswith("//"):
                url = "https:" + url
            # Par défaut, IGDB renvoie t_thumb, on peut exposer directement le grand format
            return url.replace("t_thumb", "t_cover_big")
    return None


def _extract_screenshots(screenshots: Any) -> list[dict]:
    out = []
    for s in screenshots or []:
        if isinstance(s, dict):
            url = s.get("url", "")
            if url.startswith("//"):
                url = "https:" + url
            url = url.replace("t_thumb", "t_screenshot_big")
            out.append({"url": url})
    return out


def _extract_entities(entities: Any) -> list[dict]:
    out = []
    for item in entities or []:
        if isinstance(item, dict):
            item_id = item.get("id")
            item_name = item.get("name")
            if item_name:
                out.append({"id": item_id, "name": item_name})
    return out


def _extract_publisher(involved_companies: Any) -> dict | None:
    for ic in involved_companies or []:
        if isinstance(ic, dict) and ic.get("publisher"):
            company = ic.get("company")
            if isinstance(company, dict) and company.get("name"):
                return {"name": company["name"]}
    return None


def normalize_igdb_game(g: dict[str, Any]) -> dict[str, Any]:
    """
    Transforme une réponse IGDB brute vers le contrat NormalizedGame.
    """
    igdb_id = g.get("id")
    if igdb_id is None:
        igdb_id = 0

    # Normalisation du nom (g.get("display_name") provient éventuellement de l'enrichissement Wikidata)
    name = g.get("display_name") or g.get("name") or "Unknown"

    return {
        "igdb_id": igdb_id,
        "django_id": None,
        "name": name,
        "summary": g.get("summary"),
        "cover_url": _extract_cover_url(g.get("cover")),
        "release_date": _extract_release_date(g.get("first_release_date")),
        "platforms": _extract_entities(g.get("platforms")),
        "genres": _extract_entities(g.get("genres")),
        "collections": _extract_entities(g.get("collections")),
        "franchises": _extract_entities(g.get("franchises")),
        "publisher": _extract_publisher(g.get("involved_companies")),
        "user_library": None,
        "user_rating": None,
        "screenshots": _extract_screenshots(g.get("screenshots")),
        "videos": g.get("videos") or [],
    }


def enrich_normalized_games(normalized_games: list[dict[str, Any]], user=None) -> list[dict[str, Any]]:
    """
    Enrichit une liste de NormalizedGame (issus d'IGDB) avec les données locales Django
    si elles existent (django_id, user_library, user_rating).
    PAS de création ni de modification en base ici.
    """
    if not normalized_games:
        return []

    igdb_ids = [g["igdb_id"] for g in normalized_games if g.get("igdb_id")]
    if not igdb_ids:
        return normalized_games

    # On récupère les jeux existants en base
    matching_games = Game.objects.filter(igdb_id__in=igdb_ids)
    game_map = {g.igdb_id: g for g in matching_games}

    # Si utilisateur connecté, on pré-récupère ses données pour éviter le N+1
    user_games_map = {}
    ratings_map = {}
    if user and user.is_authenticated:
        user_games = UserGame.objects.filter(user=user, game__igdb_id__in=igdb_ids)
        user_games_map = {ug.game.igdb_id: ug for ug in user_games}

        user_ratings = Rating.objects.filter(user=user, game__igdb_id__in=igdb_ids)
        ratings_map = {r.game.igdb_id: r for r in user_ratings}

    for g in normalized_games:
        igdb_id = g.get("igdb_id")
        if not igdb_id or igdb_id not in game_map:
            continue

        django_game = game_map[igdb_id]
        g["django_id"] = django_game.id

        # Injection des données utilisateur
        if igdb_id in user_games_map:
            ug = user_games_map[igdb_id]
            g["user_library"] = {
                "status": ug.status,
                "is_favorite": ug.is_favorite,
            }

        if igdb_id in ratings_map:
            r = ratings_map[igdb_id]
            g["user_rating"] = {
                "value": float(r.value),
                "rating_type": r.rating_type,
            }

    return normalized_games
