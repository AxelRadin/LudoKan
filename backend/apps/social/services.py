from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from notifications.signals import notify

from apps.social.models import FriendRequest, Friendship
from apps.social.utils import are_friends, create_friendship, delete_friendship, pending_request_between


def _notify_friend_request_received(from_user, to_user) -> None:
    notify.send(
        from_user,
        recipient=to_user,
        verb="friend_request_received",
        description=f"{from_user.pseudo} t’a envoyé une demande d’ami.",
    )


def _notify_friend_request_accepted(accepter, requester) -> None:
    notify.send(
        accepter,
        recipient=requester,
        verb="friend_request_accepted",
        description=f"{accepter.pseudo} a accepté ta demande d’ami.",
    )


@dataclass
class SendFriendRequestResult:
    request: FriendRequest | None
    auto_accepted: bool = False


@transaction.atomic
def send_friend_request(from_user, to_user) -> SendFriendRequestResult:
    if from_user.pk == to_user.pk:
        raise ValueError("Impossible de s’ajouter soi-même.")
    if are_friends(from_user, to_user):
        raise ValueError("Vous êtes déjà amis.")

    reverse = FriendRequest.objects.filter(
        from_user=to_user,
        to_user=from_user,
        status=FriendRequest.Status.PENDING,
    ).first()
    if reverse:
        reverse.delete()
        create_friendship(from_user, to_user)
        _notify_friend_request_accepted(from_user, to_user)
        return SendFriendRequestResult(request=None, auto_accepted=True)

    existing = FriendRequest.objects.filter(
        from_user=from_user,
        to_user=to_user,
        status=FriendRequest.Status.PENDING,
    ).first()
    if existing:
        return SendFriendRequestResult(request=existing, auto_accepted=False)

    FriendRequest.objects.filter(
        from_user=from_user,
        to_user=to_user,
        status__in=[FriendRequest.Status.DECLINED, FriendRequest.Status.CANCELLED],
    ).delete()

    fr = FriendRequest.objects.create(from_user=from_user, to_user=to_user, status=FriendRequest.Status.PENDING)
    _notify_friend_request_received(from_user, to_user)
    return SendFriendRequestResult(request=fr, auto_accepted=False)


@transaction.atomic
def accept_friend_request(request: FriendRequest, accepter) -> Friendship:
    if request.to_user_id != accepter.pk:
        raise PermissionError("Seul le destinataire peut accepter.")
    if request.status != FriendRequest.Status.PENDING:
        raise ValueError("Cette demande n’est plus en attente.")

    friendship = create_friendship(request.from_user, request.to_user)
    requester = request.from_user
    request.delete()
    _notify_friend_request_accepted(accepter, requester)
    return friendship


@transaction.atomic
def decline_friend_request(request: FriendRequest, user) -> None:
    if request.to_user_id != user.pk:
        raise PermissionError("Seul le destinataire peut refuser.")
    if request.status != FriendRequest.Status.PENDING:
        raise ValueError("Cette demande n’est plus en attente.")
    request.delete()


@transaction.atomic
def cancel_friend_request(request: FriendRequest, user) -> None:
    if request.from_user_id != user.pk:
        raise PermissionError("Seul l’expéditeur peut annuler.")
    if request.status != FriendRequest.Status.PENDING:
        raise ValueError("Cette demande n’est plus en attente.")
    request.delete()


@transaction.atomic
def remove_friendship(user, other) -> None:
    if not are_friends(user, other):
        raise ValueError("Aucune amitié avec cet utilisateur.")
    delete_friendship(user, other)


def relation_state(viewer, owner) -> str:
    """
    État pour l’UI : none | friends | pending_outgoing | pending_incoming | self
    """
    if not viewer or not getattr(viewer, "is_authenticated", False):
        return "anonymous"
    if viewer.pk == owner.pk:
        return "self"
    if are_friends(viewer, owner):
        return "friends"
    pr = pending_request_between(viewer, owner)
    if not pr:
        return "none"
    if pr.from_user_id == viewer.pk:
        return "pending_outgoing"
    return "pending_incoming"
