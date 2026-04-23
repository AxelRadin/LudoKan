from rest_framework.permissions import BasePermission

from apps.parties.models import GamePartyMember


class IsPartyFlowMember(BasePermission):
    """
    L'utilisateur doit être membre « flow » de la party : membership actif et pas de `left_at`.
    S'applique via `check_object_permissions(request, party)` sur une instance `GameParty`.
    """

    message = "You are not an active member of this party."

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return GamePartyMember.objects.filter(
            party=obj,
            user=user,
            membership_status=GamePartyMember.MembershipStatus.ACTIVE,
            left_at__isnull=True,
        ).exists()
