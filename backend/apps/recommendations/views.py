from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game
from apps.recommendations.serializers import RecommendedGameSerializer


class RecommendationsView(APIView):
    """GET /api/recommendations/ — Suggestions personnalisées pour l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        games = Game.objects.prefetch_related("genres", "platforms").order_by("-popularity_score")[:10]
        serializer = RecommendedGameSerializer(games, many=True, context={"request": request})
        return Response(serializer.data)
