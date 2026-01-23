from rest_framework import generics, permissions
from .models import UserGame
from .serializers import UserGameSerializer


class UserGameListCreateView(generics.ListCreateAPIView):
    """
    GET  -> liste des jeux (temporairement tous les jeux)
    POST -> ajouter un jeu (sans auth pour l’instant)
    """
    serializer_class = UserGameSerializer
    # ⬇⬇⬇ AVANT : IsAuthenticated
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Pour tester simplement, on renvoie tout
        return UserGame.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        # ⚠️ TEMPORAIRE : on ne met pas encore de "user"
        # Tu pourras adapter plus tard quand on aura l’auth
        serializer.save(user_id=1)  # à condition que l'user id=1 existe


class UserGameDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserGameSerializer
    # ⬇⬇⬇ AVANT : IsAuthenticated
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return UserGame.objects.all()
