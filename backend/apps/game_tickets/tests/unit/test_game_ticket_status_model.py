import pytest
from django.core.exceptions import ValidationError

from apps.game_tickets.models import GameTicket


@pytest.mark.django_db
def test_valid_status_transition_pending_to_reviewing(user):
    ticket = GameTicket.objects.create(user=user, game_name="Test")

    ticket.change_status(GameTicket.Status.REVIEWING)

    assert ticket.status == GameTicket.Status.REVIEWING


@pytest.mark.django_db
def test_invalid_status_transition_pending_to_approved(user):
    ticket = GameTicket.objects.create(user=user, game_name="Test")

    with pytest.raises(ValidationError):
        ticket.change_status(GameTicket.Status.APPROVED)


@pytest.mark.django_db
def test_reviewing_to_rejected(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test",
        status=GameTicket.Status.REVIEWING,
    )

    ticket.change_status(GameTicket.Status.REJECTED)

    assert ticket.status == GameTicket.Status.REJECTED


@pytest.mark.django_db
def test_cannot_transition_from_rejected(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test",
        status=GameTicket.Status.REJECTED,
    )

    with pytest.raises(ValidationError):
        ticket.change_status(GameTicket.Status.APPROVED)
