import pytest

from apps.game_tickets.models import GameTicket


@pytest.mark.django_db
def test_game_ticket_default_status(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
    )

    assert ticket.status == GameTicket.Status.PENDING


@pytest.mark.django_db
def test_game_ticket_str(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
    )

    assert "Test Game" in str(ticket)
