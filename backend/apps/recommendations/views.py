import secrets

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.igdb_client import igdb_request
from apps.games.igdb_normalizer import enrich_normalized_games, normalize_igdb_game
from apps.games.models import Genre
from apps.library.models import UserGame
from apps.recommendations.utils import get_user_genre_weights

_RECOMMENDATIONS_LIMIT = 10
_IGDB_FETCH_POOL = 50
_MIN_IGDB_RATING_COUNT = 50


class RecommendationsView(APIView):
    """GET /api/recommendations/ — Suggestions personnalisées pour l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        genre_weights = get_user_genre_weights(user)

        if not genre_weights:
            return Response([])

        # Top genres (seuil 50% du poids max)
        max_weight = max(genre_weights.values())
        threshold = max_weight * 0.5
        top_django_genre_ids = [gid for gid, w in genre_weights.items() if w >= threshold]

        top_igdb_genre_ids = [gid for gid in Genre.objects.filter(id__in=top_django_genre_ids).values_list("igdb_id", flat=True) if gid is not None]

        if not top_igdb_genre_ids:
            return Response([])

        # IGDB IDs des jeux déjà dans la bibliothèque (à exclure)
        owned_igdb_ids = set(UserGame.objects.filter(user=user).values_list("game__igdb_id", flat=True))

        genre_ids_str = ",".join(map(str, top_igdb_genre_ids))
        query = f"""
            fields id, name, cover.url, genres.id, genres.name,
                   screenshots.url, total_rating, total_rating_count, first_release_date;
            where genres = ({genre_ids_str})
                & total_rating_count >= {_MIN_IGDB_RATING_COUNT}
                & version_parent = null
                & cover != null
                & screenshots != null;
            sort total_rating desc;
            limit {_IGDB_FETCH_POOL};
        """

        raw_games = igdb_request("games", query)
        if not isinstance(raw_games, list):
            return Response([])

        # Exclure les jeux déjà possédés puis mélanger pour varier les suggestions
        candidates = [g for g in raw_games if g.get("id") not in owned_igdb_ids]
        secrets.SystemRandom().shuffle(candidates)

        results = [normalize_igdb_game(g) for g in candidates[:_RECOMMENDATIONS_LIMIT]]

        results = enrich_normalized_games(results, user=user)

        # Ajouter 'id' pour la compatibilité avec les tests et le contrat attendu par certains clients
        for r in results:
            r["id"] = r["django_id"]

        return Response(results)
