"""
Création et rattachement des collections système (Ma ludothèque, Jeux Steam).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.users.models import CustomUser

from apps.library.models import UserGame, UserLibrary, UserLibraryEntry

MA_LUDOTHEQUE_NAME = "Ma ludothèque"
STEAM_COLLECTION_NAME = "Jeux Steam"


def ensure_ma_ludotheque(user: CustomUser) -> UserLibrary:
    lib, _ = UserLibrary.objects.get_or_create(
        user=user,
        system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE,
        defaults={
            "name": MA_LUDOTHEQUE_NAME,
            "color": "",
            "sort_order": 0,
            "is_default": True,
            "is_visible_on_profile": False,
        },
    )
    return lib


def ensure_steam_collection(user: CustomUser) -> UserLibrary | None:
    if not hasattr(user, "steam_profile"):
        return None
    lib, _ = UserLibrary.objects.get_or_create(
        user=user,
        system_key=UserLibrary.SystemKey.STEAM,
        defaults={
            "name": STEAM_COLLECTION_NAME,
            "color": "",
            "sort_order": 1,
            "is_default": False,
            "is_visible_on_profile": False,
        },
    )
    return lib


def attach_user_game_to_ma_ludotheque(user_game: UserGame) -> None:
    """Chaque jeu en ludothèque appartient toujours à « Ma ludothèque »."""
    ma = ensure_ma_ludotheque(user_game.user)
    UserLibraryEntry.objects.get_or_create(library=ma, user_game=user_game)


def attach_user_games_to_steam_collection(user: CustomUser, user_games: list[UserGame]) -> None:
    """Ajoute les entrées « Jeux Steam » sans modifier statut / favori / autres collections."""
    steam_lib = ensure_steam_collection(user)
    if not steam_lib or not user_games:
        return
    for ug in user_games:
        if ug.user_id != user.id:
            continue
        UserLibraryEntry.objects.get_or_create(library=steam_lib, user_game=ug)


def sync_steam_entries_for_matched_games(user: CustomUser, games_qs) -> None:
    """Après sync Steam : rattache les UserGame concernés à la collection Jeux Steam."""
    game_ids = list(games_qs.values_list("pk", flat=True))
    if not game_ids:
        return
    ugs = list(UserGame.objects.filter(user=user, game_id__in=game_ids))
    attach_user_games_to_steam_collection(user, ugs)
