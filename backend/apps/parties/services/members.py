from __future__ import annotations

from django.db.models import Count, Q, QuerySet

from apps.parties.models import GameParty, GamePartyMember


def active_members_qs(*, party_id: int) -> QuerySet[GamePartyMember]:
    """
    Membres pris en compte dans le flow : `membership_status = active` et `left_at` nul.

    Ne pas utiliser le manager inverse sur `party.members` pour ce critère.
    """
    return GamePartyMember.objects.filter(
        party_id=party_id,
        membership_status=GamePartyMember.MembershipStatus.ACTIVE,
        left_at__isnull=True,
    )


def active_member_count(*, party_id: int) -> int:
    return active_members_qs(party_id=party_id).count()


def _open_parties_for_game_qs(game_id: int) -> QuerySet[GameParty]:
    return GameParty.objects.filter(
        game_id=game_id,
        status=GameParty.Status.OPEN,
    )


def open_parties_with_active_count_qs(game_id: int) -> QuerySet[GameParty]:
    """
    Parties ouvertes pour un jeu, annotées avec le nombre de membres actifs.
    Utilisé pour le tri « plus remplie d'abord », puis plus ancienne.
    """
    return _open_parties_for_game_qs(game_id).annotate(
        _active_member_count=Count(
            "members",
            filter=Q(
                members__membership_status=GamePartyMember.MembershipStatus.ACTIVE,
                members__left_at__isnull=True,
            ),
        )
    )
