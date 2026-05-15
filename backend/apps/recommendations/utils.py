from collections import Counter

from apps.games.models import Rating
from apps.library.models import UserGame

_HIGH_RATING_THRESHOLD = 7.0
_RATED_GAME_WEIGHT = 2


def get_user_genre_weights(user) -> dict[int, int]:
    """
    Retourne un dict {genre_id: poids} calculé depuis la bibliothèque et les notes élevées.
    Un jeu bien noté compte double dans le poids.
    """
    counter: Counter[int] = Counter()

    library_genre_ids = UserGame.objects.filter(user=user).values_list("game__genres__id", flat=True)
    for gid in library_genre_ids:
        if gid is not None:
            counter[gid] += 1

    rated_genre_ids = Rating.objects.filter(user=user, normalized_value__gte=_HIGH_RATING_THRESHOLD).values_list("game__genres__id", flat=True)
    for gid in rated_genre_ids:
        if gid is not None:
            counter[gid] += _RATED_GAME_WEIGHT

    return dict(counter)


def get_user_preferred_genre_ids(user) -> list[int]:
    return list(get_user_genre_weights(user).keys())
