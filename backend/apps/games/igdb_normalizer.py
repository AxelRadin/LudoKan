from datetime import datetime
from typing import Any


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

    django_id = None

    # Normalisation du nom (g.get("display_name") provient éventuellement de l'enrichissement Wikidata)
    name = g.get("display_name") or g.get("name") or "Unknown"

    summary = g.get("summary")

    # Conversion de first_release_date
    release_date = None
    first_release_date = g.get("first_release_date")
    if first_release_date is not None:
        try:
            # first_release_date est un timestamp UNIX
            release_date = datetime.fromtimestamp(first_release_date).strftime("%Y-%m-%d")
        except Exception:
            pass

    # Reconstruction de cover_url
    cover_url = None
    cover = g.get("cover")
    if isinstance(cover, dict):
        url = cover.get("url")
        if isinstance(url, str):
            if url.startswith("//"):
                url = "https:" + url
            # Par défaut, IGDB renvoie t_thumb, on peut exposer directement le grand format
            cover_url = url.replace("t_thumb", "t_cover_big")

    # Mapping platforms
    platforms = []
    for p in g.get("platforms") or []:
        if isinstance(p, dict):
            pid = p.get("id")
            pname = p.get("name")
            if pname:
                platforms.append({"id": pid, "name": pname})

    # Mapping genres
    genres = []
    for gen in g.get("genres") or []:
        if isinstance(gen, dict):
            gid = gen.get("id")
            gname = gen.get("name")
            if gname:
                genres.append({"id": gid, "name": gname})

    return {
        "igdb_id": igdb_id,
        "django_id": django_id,
        "name": name,
        "summary": summary,
        "cover_url": cover_url,
        "release_date": release_date,
        "platforms": platforms,
        "genres": genres,
        "user_library": None,
        "user_rating": None,
    }
