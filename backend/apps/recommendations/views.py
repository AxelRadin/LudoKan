from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.library.models import UserGame
from apps.recommendations.serializers import RecommendedGameSerializer
from apps.recommendations.utils import get_user_preferred_genre_ids

_RECOMMENDATIONS_LIMIT = 10


class RecommendationsView(APIView):
    """GET /api/recommendations/ — Suggestions personnalisées pour l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        genre_ids = get_user_preferred_genre_ids(user)
        owned_game_ids = UserGame.objects.filter(user=user).values_list("game_id", flat=True)

        qs = Game.objects.prefetch_related("genres", "platforms").exclude(id__in=owned_game_ids)

        if genre_ids:
            qs = qs.filter(genres__id__in=genre_ids).distinct()

        games = qs.order_by("-popularity_score")[:_RECOMMENDATIONS_LIMIT]
        serializer = RecommendedGameSerializer(games, many=True, context={"request": request})
        return Response(serializer.data)
