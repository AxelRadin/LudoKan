"""Constantes partagées par le proxy IGDB (requêtes APICalypse, URLs, TTL)."""

import time

# Champs IGDB communs pour les listes de jeux
FIELDS_GAMES_LIST = "fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count;"
FIELDS_GAMES_LIST_WITH_GENRES = "fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count,genres;"
FIELDS_GAMES_SEARCH = (
    "fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count,"
    + "alternative_names.name,game_localizations.name,game_localizations.region.name,"
    + "franchises.id,franchises.name,collections.id,collections.name;"
)
FIELDS_GAME_DETAIL = (
    "fields name,cover.url,first_release_date,summary,platforms.name,genres.name,total_rating,total_rating_count,"
    + "collections.id,collections.name,franchises.id,franchises.name,"
    + "involved_companies.company.name,involved_companies.publisher,"
    + "screenshots.url,videos.video_id,videos.name;"
)
FIELDS_SEARCH_PAGE = "fields name,cover.url,first_release_date,platforms.name,total_rating,total_rating_count;"

NOW = int(time.time())
TRENDING_SORTS = {
    "popularity": "where total_rating_count > 0; sort total_rating_count desc;",
    "rating": "where total_rating_count > 50 & total_rating != null; sort total_rating desc;",
    "recent": f"where first_release_date < {NOW} & first_release_date > 0 & total_rating_count > 0; sort first_release_date desc;",
    "most_rated": "where total_rating_count > 100 & total_rating != null; sort total_rating_count desc;",
}

MYMEMORY_URL = "https://api.mymemory.translated.net/get"
MAX_TRANSLATE_TEXT_LEN = 20_000
TRENDING_CACHE_TTL = 120  # secondes (2 min)
