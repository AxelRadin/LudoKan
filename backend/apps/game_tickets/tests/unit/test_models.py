import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django_fsm import TransitionNotAllowed

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


@pytest.mark.django_db
def test_ticket_can_go_from_pending_to_reviewing(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.PENDING,
    )

    ticket.start_review()  # correction ici
    ticket.save()

    assert ticket.status == GameTicket.Status.REVIEWING


@pytest.mark.django_db
def test_ticket_can_be_approved_from_reviewing(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.REVIEWING,
    )

    ticket.approve()
    ticket.save()

    assert ticket.status == GameTicket.Status.APPROVED


@pytest.mark.django_db
def test_ticket_can_be_rejected_from_reviewing(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.REVIEWING,
    )

    ticket.reject()
    ticket.save()

    assert ticket.status == GameTicket.Status.REJECTED


@pytest.mark.django_db
def test_ticket_can_be_published_from_approved(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.APPROVED,
    )

    ticket.publish()
    ticket.save()

    assert ticket.status == GameTicket.Status.PUBLISHED


@pytest.mark.django_db
def test_invalid_transition_pending_to_approved(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.PENDING,
    )

    with pytest.raises(TransitionNotAllowed):
        ticket.approve()


@pytest.mark.django_db
def test_rejected_ticket_is_final(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.REJECTED,
    )

    with pytest.raises(TransitionNotAllowed):
        ticket.start_review()  # correction ici


@pytest.mark.django_db
def test_published_ticket_is_final(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.PUBLISHED,
    )

    with pytest.raises(TransitionNotAllowed):
        ticket.start_review()  # correction ici
