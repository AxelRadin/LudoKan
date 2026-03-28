
from apps.games.igdb_normalizer import normalize_igdb_game


def test_normalize_igdb_game_basic():
    """Vérifie la normalisation avec tous les champs présents idéaux (mock d'une réponse de vue détails)."""
    raw_game = {
        "id": 1234,
        "name": "Super Game",
        "display_name": "Super Jeu FR",
        "summary": "Un jeu génial",
        "first_release_date": 1672531200,  # 2023-01-01 GMT
        "cover": {"id": 111, "url": "//images.igdb.com/igdb/image/upload/t_thumb/co123.jpg"},
        "platforms": [{"id": 4, "name": "N64"}],
        "genres": [{"id": 33, "name": "Arcade"}],
    }

    normalized = normalize_igdb_game(raw_game)

    assert normalized["igdb_id"] == 1234
    assert normalized["django_id"] is None
    assert normalized["name"] == "Super Jeu FR"  # le wiki display_name prime
    assert normalized["summary"] == "Un jeu génial"
    assert normalized["release_date"] == "2023-01-01" or normalized["release_date"] == "2022-12-31"  # dépend de la locale, tolérant.
    assert "t_cover_big" in normalized["cover_url"]
    assert normalized["cover_url"].startswith("https://")
    assert normalized["platforms"] == [{"id": 4, "name": "N64"}]
    assert normalized["genres"] == [{"id": 33, "name": "Arcade"}]
    assert normalized["user_library"] is None
    assert normalized["user_rating"] is None


def test_normalize_igdb_game_empty_and_nulls():
    """Vérifie le comportement de la normalisation si l'API retourne des null/undefined/missing fields."""
    raw_game = {}

    normalized = normalize_igdb_game(raw_game)

    assert normalized["igdb_id"] == 0
    assert normalized["name"] == "Unknown"
    assert normalized["summary"] is None
    assert normalized["release_date"] is None
    assert normalized["cover_url"] is None
    assert normalized["platforms"] == []
    assert normalized["genres"] == []


def test_normalize_igdb_game_malformed_url():
    """Vérifie qu'une URL de type string direct ou un format bizarre ne fait pas crasher et se normalise si possible."""
    raw_game_1 = {"id": 99, "cover": {"url": "http://example.com/image.jpg"}}
    norm1 = normalize_igdb_game(raw_game_1)
    assert norm1["cover_url"] == "http://example.com/image.jpg"  # pas de "t_thumb" à remplacer mais ça marche

    raw_game_2 = {"id": 100, "cover": "this is a string, which happens if fields cover without cover.url is queried"}
    norm2 = normalize_igdb_game(raw_game_2)
    assert norm2["cover_url"] is None  # Ne tente pas d'extraire url d'une string


def test_normalize_igdb_game_malformed_timestamp():
    """Vérifie qu'un timestamp erroné ne casse pas le worker."""
    raw_game = {"id": 5, "first_release_date": "Not a number timestamp"}
    normalized = normalize_igdb_game(raw_game)
    assert normalized["release_date"] is None
