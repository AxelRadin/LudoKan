from datetime import datetime
from typing import Any


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


def _extract_entities(entities: Any) -> list[dict]:
    out = []
    for item in entities or []:
        if isinstance(item, dict):
            item_id = item.get("id")
            item_name = item.get("name")
            if item_name:
                out.append({"id": item_id, "name": item_name})
    return out


def normalize_igdb_game(g: dict[str, Any]) -> dict[str, Any]:
    """
    Transforme une réponse IGDB brute vers le contrat NormalizedGame.
    Garantit que l'objet retourné correspond (côté backend) à la structure:
      - igdb_id: number
      - django_id: number | null
      - name: string
      - summary: string | null
      - cover_url: string | null
      - release_date: string | null // ISO YYYY-MM-DD
      - platforms: BasePlatform[]
      - genres: BaseGenre[]
      - user_library: null
      - user_rating: null
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
        "user_library": None,
        "user_rating": None,
    }
