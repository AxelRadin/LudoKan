from rest_framework.permissions import BasePermission

from apps.users.permissions import IsAdminWithPermission


class CanReadRating(IsAdminWithPermission, BasePermission):
    """Permission admin pour la lecture des ratings."""

    required_permission = "rating_read"


class CanDeleteRating(IsAdminWithPermission, BasePermission):
    """Permission admin pour la suppression des ratings."""

    required_permission = "rating_delete"
