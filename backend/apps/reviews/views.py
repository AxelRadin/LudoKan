from rest_framework import permissions, viewsets

from apps.reviews.models import Review
from apps.reviews.serializers import ReviewReadSerializer, ReviewWriteSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gerer les reviews.

    Endpoints disponibles :
    - GET    /api/reviews/          : Liste toutes les reviews
    - POST   /api/reviews/          : Creer une review (authentifie)
    - GET    /api/reviews/{id}/     : Detail d'une review
    - PUT    /api/reviews/{id}/     : Modifier une review (proprietaire uniquement)
    - PATCH  /api/reviews/{id}/     : Modification partielle (proprietaire uniquement)
    - DELETE /api/reviews/{id}/     : Supprimer une review (proprietaire uniquement)

    Filtres disponibles :
    - ?game=<id>  : Filtrer par jeu
    - ?user=<id>  : Filtrer par utilisateur
    """

    queryset = Review.objects.select_related("user", "game", "rating").all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        """
        Utilise ReadSerializer pour GET, WriteSerializer pour POST/PUT/PATCH.
        """
        if self.action in ["list", "retrieve"]:
            return ReviewReadSerializer
        return ReviewWriteSerializer

    def get_queryset(self):
        """
        Permet de filtrer les reviews par jeu ou par utilisateur.
        Exemples :
        - /api/reviews/?game=5
        - /api/reviews/?user=3
        """
        queryset = super().get_queryset()

        # Filtre par jeu
        game_id = self.request.query_params.get("game")
        if game_id:
            queryset = queryset.filter(game_id=game_id)

        # Filtre par utilisateur
        user_id = self.request.query_params.get("user")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset

    def perform_create(self, serializer):
        """
        Associe automatiquement l'utilisateur connecte lors de la creation.
        """
        serializer.save(user=self.request.user)

    def get_permissions(self):
        """
        Permissions :
        - Lecture (GET) : Tout le monde
        - Creation (POST) : Utilisateurs authentifies
        - Modification/Suppression (PUT/PATCH/DELETE) : Proprietaire uniquement
        """
        if self.action in ["update", "partial_update", "destroy"]:
            return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]
        return super().get_permissions()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission personnalisee : seul le proprietaire peut modifier/supprimer.
    """

    def has_object_permission(self, request, view, obj):
        # Lecture autorisee pour tout le monde
        if request.method in permissions.SAFE_METHODS:
            return True

        # Modification/suppression : uniquement le proprietaire
        return obj.user == request.user
