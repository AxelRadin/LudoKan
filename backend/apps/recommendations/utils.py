from apps.games.models import Rating
from apps.library.models import UserGame

_HIGH_RATING_THRESHOLD = 7.0


def get_user_preferred_genre_ids(user) -> list[int]:
    """
    Retourne les IDs de genres préférés de l'utilisateur,
    déduits de sa bibliothèque et de ses notes élevées (>= 7/10).
    """
    library_genre_ids = UserGame.objects.filter(user=user).values_list("game__genres__id", flat=True).distinct()

    rated_genre_ids = (
        Rating.objects.filter(user=user, normalized_value__gte=_HIGH_RATING_THRESHOLD).values_list("game__genres__id", flat=True).distinct()
    )

    genre_ids = set(library_genre_ids) | set(rated_genre_ids)
    genre_ids.discard(None)
    return list(genre_ids)
