from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import Game


class RecommendationsView(APIView):
    """GET /api/recommendations/ — Suggestions personnalisées pour l'utilisateur connecté."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        games = Game.objects.prefetch_related("genres", "platforms").order_by("-popularity_score")[:10]
        data = [
            {
                "igdb_id": g.igdb_id,
                "django_id": g.id,
                "name": g.name,
                "summary": g.description or None,
                "cover_url": g.cover_url,
                "release_date": str(g.release_date) if g.release_date else None,
                "genres": [{"id": genre.id, "name": genre.name} for genre in g.genres.all()],
                "platforms": [{"id": p.id, "name": p.name} for p in g.platforms.all()],
                "user_library": None,
                "user_rating": None,
            }
            for g in games
        ]
        return Response(data)
