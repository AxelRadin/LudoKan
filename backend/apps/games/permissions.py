from rest_framework.permissions import BasePermission

from apps.users.permissions import IsAdminWithPermission


class CanReadRating(IsAdminWithPermission, BasePermission):
    """Permission admin pour la lecture des ratings."""

    required_permission = "rating_read"


class CanDeleteRating(IsAdminWithPermission, BasePermission):
    """Permission admin pour la suppression des ratings."""

    required_permission = "rating_delete"


class CanReadGame(IsAdminWithPermission, BasePermission):
    """Permission admin pour la lecture des jeux."""

    required_permission = "game_read"


class CanEditGame(IsAdminWithPermission, BasePermission):
    """Permission admin pour modifier un jeu."""

    required_permission = "game_edit"


class CanDeleteGame(IsAdminWithPermission, BasePermission):
    """Permission admin pour supprimer un jeu."""

    required_permission = "game_delete"
