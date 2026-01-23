import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.game_tickets.models import GameTicket, GameTicketAttachment


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


@pytest.mark.django_db
def test_game_ticket_attachment_str(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
    )

    attachment = GameTicketAttachment.objects.create(
        ticket=ticket,
        file=SimpleUploadedFile(
            "test.png",
            b"fake content",
            content_type="image/png",
        ),
    )

    assert str(attachment) == f"Attachment for ticket {ticket.id}"
