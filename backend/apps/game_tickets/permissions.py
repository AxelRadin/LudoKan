from rest_framework.permissions import BasePermission

from apps.users.permissions import IsAdminWithPermission


class IsStaff(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class CanReadTicket(IsAdminWithPermission, BasePermission):
    """Permission admin pour la lecture des tickets d'ajout de jeu."""

    required_permission = "ticket_read"
