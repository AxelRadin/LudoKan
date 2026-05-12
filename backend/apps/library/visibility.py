from __future__ import annotations

from django.db.models import Q, QuerySet

from apps.library.models import UserGame, UserLibrary


def viewer_can_see_collection(*, owner_id: int, viewer, library: UserLibrary) -> bool:
    """
    Règles :
    - public (anonyme ou non ami) : ``is_visible_on_profile``
    - ami authentifié : ``is_visible_on_profile`` ou ``is_visible_to_friends``
    """
    if library.user_id != owner_id:
        return False
    if library.is_visible_on_profile:
        return True
    if viewer is None or not getattr(viewer, "is_authenticated", False):
        return False
    if viewer.pk == owner_id:
        return True
    from apps.social.utils import are_friends

    if are_friends(viewer, library.user):
        return library.is_visible_to_friends
    return False


def collections_visible_to_viewer_queryset(owner, viewer) -> QuerySet[UserLibrary]:
    """Queryset des collections de ``owner`` visibles pour ``viewer``."""
    base = UserLibrary.objects.filter(user=owner)
    q_public = Q(is_visible_on_profile=True)
    if viewer is not None and getattr(viewer, "is_authenticated", False) and viewer.pk != owner.pk:
        from apps.social.utils import are_friends

        if are_friends(viewer, owner):
            return base.filter(q_public | Q(is_visible_to_friends=True))
    return base.filter(q_public)


def visible_user_games_queryset(owner, viewer):
    """Jeux présents dans au moins une collection visible pour ``viewer``."""
    lib_ids = collections_visible_to_viewer_queryset(owner, viewer).values_list("pk", flat=True)
    return UserGame.objects.filter(user=owner, library_entries__library_id__in=lib_ids).distinct()
