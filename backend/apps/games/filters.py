"""
Filtres personnalisés pour l'application Games.
"""

import django_filters

from apps.games.models import Game


class GameFilter(django_filters.FilterSet):
    """
    FilterSet personnalisé pour le modèle Game.

    Permet de filtrer par:
    - genres: Filtrage par IDs de genres (Many-to-Many), supporte plusieurs valeurs
    - platforms: Filtrage par IDs de plateformes (Many-to-Many), supporte plusieurs valeurs

    Exemples d'utilisation:
    - /api/games/?genre=1          # Jeux avec le genre ID 1
    - /api/games/?genre=1,2,3      # Jeux avec les genres 1, 2 ou 3
    - /api/games/?platform=4,5     # Jeux sur les plateformes 4 ou 5
    - /api/games/?genre=1&platform=2  # Jeux avec genre 1 ET plateforme 2
    """

    # Filtre pour genres (Many-to-Many)
    # BaseInFilter permet d'accepter plusieurs valeurs séparées par des virgules
    genre = django_filters.BaseInFilter(field_name="genres__id", lookup_expr="in", help_text="Filtrer par IDs de genres (ex: 1,2,3)")

    # Filtre pour plateformes (Many-to-Many)
    platform = django_filters.BaseInFilter(field_name="platforms__id", lookup_expr="in", help_text="Filtrer par IDs de plateformes (ex: 1,2,3)")

    class Meta:
        model = Game
        fields = ["genre", "platform"]
