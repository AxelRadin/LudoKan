"""
Filtres personnalisés pour l'application Games.
"""

import django_filters
from django.contrib.postgres.search import TrigramWordSimilarity
from django.db.models import Q

from apps.games.models import Game


class GameFilter(django_filters.FilterSet):
    """
    FilterSet personnalisé pour le modèle Game.

    Permet de filtrer par:
    - genres: Filtrage par IDs de genres (Many-to-Many), supporte plusieurs valeurs
    - platforms: Filtrage par IDs de plateformes (Many-to-Many), supporte plusieurs valeurs
    - min_age: Âge minimum requis (gte) — ex: min_age=12 → jeux pour 12 ans et +
    - min_players: Nombre de joueurs minimum (lte) — ex: min_players=2 → jeux jouables à 2
    - max_players: Nombre de joueurs maximum (gte) — ex: max_players=4 → jeux acceptant 4+ joueurs

    Exemples d'utilisation:
    - /api/games/?genre=1          # Jeux avec le genre ID 1
    - /api/games/?genre=1,2,3      # Jeux avec les genres 1, 2 ou 3
    - /api/games/?platform=4,5     # Jeux sur les plateformes 4 ou 5
    - /api/games/?genre=1&platform=2  # Jeux avec genre 1 ET plateforme 2
    - /api/games/?min_age=12       # Jeux pour 12 ans et plus
    - /api/games/?min_players=2    # Jeux jouables à 2 joueurs minimum
    - /api/games/?max_players=4    # Jeux acceptant jusqu'à 4 joueurs
    - /api/games/?min_age=12&min_players=2  # Combinaison de filtres
    """

    # Filtre pour genres (Many-to-Many)
    # BaseInFilter permet d'accepter plusieurs valeurs séparées par des virgules
    genre = django_filters.BaseInFilter(field_name="genres__id", lookup_expr="in", help_text="Filtrer par IDs de genres (ex: 1,2,3)")

    # Filtre pour plateformes (Many-to-Many)
    platform = django_filters.BaseInFilter(field_name="platforms__id", lookup_expr="in", help_text="Filtrer par IDs de plateformes (ex: 1,2,3)")

    # Filtres numériques
    # min_age__gte : retourne les jeux dont l'âge minimum requis >= valeur demandée
    min_age = django_filters.NumberFilter(field_name="min_age", lookup_expr="gte", help_text="Âge minimum requis (ex: 12 → jeux pour 12 ans et +)")

    # min_players__lte : retourne les jeux dont le nombre minimum de joueurs <= valeur demandée
    # (un jeu jouable à 1 joueur est aussi jouable à 2)
    min_players = django_filters.NumberFilter(
        field_name="min_players", lookup_expr="lte", help_text="Nombre minimum de joueurs (ex: 2 → jeux jouables à 2)"
    )

    # max_players__gte : retourne les jeux dont le nombre maximum de joueurs >= valeur demandée
    # (un jeu pour 4 joueurs accepte bien un groupe de 4)
    max_players = django_filters.NumberFilter(
        field_name="max_players", lookup_expr="gte", help_text="Nombre maximum de joueurs (ex: 4 → jeux acceptant 4+ joueurs)"
    )

    search = django_filters.CharFilter(method="filter_search", label="Recherche par nom (sous-chaîne)")

    def filter_search(self, queryset, name, value):
        if not value or not str(value).strip():
            return queryset
        v = str(value).strip()
        return (
            queryset.annotate(
                sim_name=TrigramWordSimilarity(v, "name"),
                sim_name_fr=TrigramWordSimilarity(v, "name_fr"),
            )
            .filter(Q(sim_name__gte=0.3) | Q(sim_name_fr__gte=0.3))
            .order_by("-sim_name")
        )

    class Meta:
        model = Game
        fields = ["genre", "platform", "min_age", "min_players", "max_players", "search"]
