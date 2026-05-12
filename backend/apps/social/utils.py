from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.social.models import FriendRequest, Friendship

User = get_user_model()


def ordered_user_pair(user1_id: int, user2_id: int) -> tuple[int, int]:
    if user1_id == user2_id:
        raise ValueError("Identical users")
    if user1_id < user2_id:
        return user1_id, user2_id
    return user2_id, user1_id


def are_friends(a, b) -> bool:
    if not a or not b or not getattr(a, "pk", None) or not getattr(b, "pk", None):
        return False
    if a.pk == b.pk:
        return False
    ua, ub = ordered_user_pair(a.pk, b.pk)
    return Friendship.objects.filter(user_a_id=ua, user_b_id=ub).exists()


def create_friendship(user1, user2) -> Friendship:
    ua, ub = ordered_user_pair(user1.pk, user2.pk)
    return Friendship.objects.get_or_create(user_a_id=ua, user_b_id=ub)[0]


def delete_friendship(user1, user2) -> int:
    ua, ub = ordered_user_pair(user1.pk, user2.pk)
    return Friendship.objects.filter(user_a_id=ua, user_b_id=ub).delete()[0]


def friends_queryset_for(user):
    """Utilisateurs liés par une Friendship à ``user``."""
    ids = list(Friendship.objects.filter(user_a=user).values_list("user_b_id", flat=True)) + list(
        Friendship.objects.filter(user_b=user).values_list("user_a_id", flat=True)
    )
    return User.objects.filter(pk__in=ids)


def friends_count(user) -> int:
    return Friendship.objects.filter(user_a=user).count() + Friendship.objects.filter(user_b=user).count()


def pending_request_between(viewer, owner) -> FriendRequest | None:
    """Demande PENDING entre les deux (dans un sens ou l’autre)."""
    return (
        FriendRequest.objects.filter(
            status=FriendRequest.Status.PENDING,
        )
        .filter(
            (Q(from_user=viewer) & Q(to_user=owner)) | (Q(from_user=owner) & Q(to_user=viewer)),
        )
        .first()
    )
