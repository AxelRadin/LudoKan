from django.db.models import Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.library.models import UserGame
from apps.recommendations.serializers import RecommendedGameSerializer
from apps.recommendations.utils import get_user_genre_weights

_RECOMMENDATIONS_LIMIT = 10
_MIN_SCREENSHOTS = 4


class RecommendationsView(APIView):
    """GET /api/recommendations/ — Suggestions personnalisées pour l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        genre_weights = get_user_genre_weights(user)

        if not genre_weights:
            return Response([])

        owned_game_ids = UserGame.objects.filter(user=user).values_list("game_id", flat=True)

        # Garder uniquement les genres les plus représentés (top 50% du poids max)
        max_weight = max(genre_weights.values())
        threshold = max_weight * 0.5
        top_genre_ids = [gid for gid, w in genre_weights.items() if w >= threshold]

        qs = (
            Game.objects.prefetch_related("genres", "platforms", "screenshots")
            .annotate(screenshot_count=Count("screenshots", distinct=True))
            .filter(screenshot_count__gte=_MIN_SCREENSHOTS)
            .exclude(id__in=owned_game_ids)
            .filter(genres__id__in=top_genre_ids)
            .distinct()
        )

        # Trier par nombre de genres correspondants aux top genres de l'utilisateur
        qs = qs.annotate(
            matching_genres=Count(
                "genres",
                filter=Q(genres__id__in=top_genre_ids),
                distinct=True,
            )
        ).order_by("-matching_genres", "id")

        games = qs[:_RECOMMENDATIONS_LIMIT]
        serializer = RecommendedGameSerializer(games, many=True, context={"request": request})
        return Response(serializer.data)
