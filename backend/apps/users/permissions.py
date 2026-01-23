from __future__ import annotations

from typing import Iterable, Set

from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import BasePermission

from .models import UserRole, UserSuspension

# Mapping centralisé rôle -> permissions métier.
# Les noms de permissions sont des chaînes libres, consommées par has_permission
# et par les vues DRF (via required_permission).
ROLE_PERMISSIONS: dict[str, set[str]] = {
    UserRole.Role.MODERATOR: {
        "user.view",
        "review.moderate",
        "rating.moderate",
    },
    UserRole.Role.ADMIN: {
        "user.view",
        "user.suspend",
        "suspend_user",
        "user.edit",
        "review.moderate",
        "rating.moderate",
        # Endpoints admin reviews
        "review_read",
        "review_edit",
        "review_delete",
    },
    # Le superadmin hérite de toutes les permissions via le joker "*".
    UserRole.Role.SUPERADMIN: {"*"},
}


def _collect_role_permissions(roles: Iterable[UserRole]) -> Set[str]:
    perms: Set[str] = set()
    for role in roles:
        role_perms = ROLE_PERMISSIONS.get(role.role, set())
        perms.update(role_perms)
    return perms


def is_user_suspended(user) -> bool:
    """
    Renvoie True si l'utilisateur a au moins une suspension active (non expirée).
    """
    if not getattr(user, "is_authenticated", False):
        return False

    now = timezone.now()
    return (
        UserSuspension.objects.filter(
            user=user,
            is_active=True,
        )
        .filter(Q(end_date__isnull=True) | Q(end_date__gt=now))
        .exists()
    )


def has_permission(user, permission: str) -> bool:
    """
    Vérifie si l'utilisateur possède une permission métier donnée.

    Règles :
    - superuser Django -> tous les droits
    - utilisateur suspendu -> aucun droit (hors cas très spécifiques à gérer ailleurs)
    - sinon, union des permissions de tous ses rôles UserRole.
    """
    if not getattr(user, "is_authenticated", False):
        return False

    # Superuser Django : on considère qu'il a tous les droits.
    if getattr(user, "is_superuser", False):
        return True

    # Un utilisateur suspendu ne doit pas passer les contrôles métier.
    if is_user_suspended(user):
        return False

    roles = UserRole.objects.filter(user=user)
    perms = _collect_role_permissions(roles)

    if "*" in perms:
        return True

    return permission in perms


class HasPermission(BasePermission):
    """
    Permission DRF générique basée sur has_permission(user, permission).

    Utilisation côté vue :
    - Soit via un attribut de vue :
        class MyView(...):
            permission_classes = [HasPermission]
            required_permission = "user.suspend"
    - Soit via une sous-classe dédiée :
        class CanSuspendUser(HasPermission):
            required_permission = "user.suspend"
    """

    # Valeur par défaut, peut être surchargée par une sous-classe.
    required_permission: str | None = None

    def has_permission(self, request, view) -> bool:
        perm_name = getattr(view, "required_permission", None) or self.required_permission
        if not perm_name:
            # Si aucune permission métier n'est spécifiée,
            # on se contente d'exiger un utilisateur authentifié.
            return getattr(request.user, "is_authenticated", False)

        return has_permission(request.user, perm_name)


class IsNotSuspended(BasePermission):
    """
    Permission DRF simple qui bloque les utilisateurs suspendus,
    réutilisable sur des endpoints sensibles.
    """

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not getattr(user, "is_authenticated", False):
            return False
        return not is_user_suspended(user)
