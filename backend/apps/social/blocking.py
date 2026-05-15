"""Blocage utilisateur : requêtes réutilisables (symétrique blocker / blocked)."""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.social.models import UserBlock

User = get_user_model()


def pair_has_block(a, b) -> bool:
    """Vrai s’il existe un blocage dans un sens ou l’autre entre ``a`` et ``b``."""
    if not a or not b:
        return False
    if not getattr(a, "pk", None) or not getattr(b, "pk", None):
        return False
    if a.pk == b.pk:
        return False
    return UserBlock.objects.filter(Q(blocker=a, blocked=b) | Q(blocker=b, blocked=a)).exists()


def blocked_user_ids_for(viewer) -> set[int]:
    """Identifiants des utilisateurs à exclure de la recherche (blocage dans un sens ou l’autre)."""
    if not viewer or not getattr(viewer, "pk", None):
        return set()
    forward = UserBlock.objects.filter(blocker=viewer).values_list("blocked_id", flat=True)
    reverse = UserBlock.objects.filter(blocked=viewer).values_list("blocker_id", flat=True)
    return set(forward) | set(reverse)
