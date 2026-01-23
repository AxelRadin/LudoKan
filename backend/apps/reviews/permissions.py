from rest_framework.permissions import BasePermission

from apps.users.permissions import IsAdminWithPermission


class CanReadReview(IsAdminWithPermission, BasePermission):
    """Permission admin pour la lecture des reviews."""

    required_permission = "review_read"


class CanEditReview(IsAdminWithPermission, BasePermission):
    """Permission admin pour la modification des reviews."""

    required_permission = "review_edit"


class CanDeleteReview(IsAdminWithPermission, BasePermission):
    """Permission admin pour la suppression des reviews."""

    required_permission = "review_delete"
