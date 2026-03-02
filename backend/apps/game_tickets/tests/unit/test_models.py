from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django_fsm import TransitionNotAllowed

from apps.game_tickets.models import GameTicket, GameTicketAttachment, GameTicketComment, GameTicketHistory


@pytest.mark.django_db
@patch("notifications.signals.notify.send")
def test_game_ticket_default_status_and_creation_notification(mock_notify, user):
    user_model = get_user_model()
    admin1 = user_model.objects.create_user(email="admin1@test.com", pseudo="a1", password="pw", is_staff=True)
    admin2 = user_model.objects.create_user(email="admin2@test.com", pseudo="a2", password="pw", is_staff=True)

    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
    )
    assert ticket.status == GameTicket.Status.PENDING

    assert mock_notify.call_count == 2

    calls = mock_notify.call_args_list
    recipients = [call.kwargs.get("recipient") for call in calls]
    assert admin1 in recipients
    assert admin2 in recipients

    for call in calls:
        assert call.kwargs.get("verb") == "ticket_created"
        assert call.kwargs.get("sender") == user
        assert call.kwargs.get("target") == ticket
        assert call.kwargs.get("game_name") == "Test Game"


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
def test_game_ticket_history_str(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test History Game",
    )
    history = GameTicketHistory.objects.create(
        ticket=ticket,
        old_state=GameTicket.Status.PENDING,
        new_state=GameTicket.Status.REVIEWING,
        actor=user,
    )
    assert str(history) == "Test History Game: pending -> reviewing"


@pytest.mark.django_db
def test_game_ticket_comment_str(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Comment Game",
    )
    comment = GameTicketComment.objects.create(
        ticket=ticket,
        author=user,
        comment="Test comment",
    )
    assert str(comment) == f"Comment by {user} on {ticket}"


@pytest.mark.django_db
@patch("notifications.signals.notify.send")
def test_ticket_can_go_from_pending_to_reviewing(mock_notify, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.PENDING,
    )

    ticket.start_review()
    ticket.save()

    assert ticket.status == GameTicket.Status.REVIEWING
    mock_notify.assert_called_once_with(
        sender=user,
        recipient=user,
        verb="ticket_reviewing",
        target=ticket,
        game_name="Test Game",
        old_status="pending",
        new_status="reviewing",
    )


@pytest.mark.django_db
@patch("notifications.signals.notify.send")
def test_ticket_can_be_approved_from_reviewing(mock_notify, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.REVIEWING,
    )

    ticket.approve()
    ticket.save()

    assert ticket.status == GameTicket.Status.APPROVED
    mock_notify.assert_called_once_with(
        sender=user,
        recipient=user,
        verb="ticket_approved",
        target=ticket,
        game_name="Test Game",
        old_status="reviewing",
        new_status="approved",
    )


@pytest.mark.django_db
@patch("notifications.signals.notify.send")
def test_ticket_can_be_rejected_from_reviewing(mock_notify, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.REVIEWING,
    )
    ticket.rejection_reason = "Incomplet"

    ticket.reject()
    ticket.save()

    assert ticket.status == GameTicket.Status.REJECTED
    mock_notify.assert_called_once_with(
        sender=user,
        recipient=user,
        verb="ticket_rejected",
        target=ticket,
        game_name="Test Game",
        old_status="reviewing",
        new_status="rejected",
        rejection_reason="Incomplet",
    )


@pytest.mark.django_db
@patch("notifications.signals.notify.send")
def test_ticket_can_be_published_from_approved(mock_notify, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.APPROVED,
    )

    ticket.publish()
    ticket.save()

    assert ticket.status == GameTicket.Status.PUBLISHED
    mock_notify.assert_called_once_with(
        sender=user,
        recipient=user,
        verb="ticket_published",
        target=ticket,
        game_name="Test Game",
        old_status="approved",
        new_status="published",
    )


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
        ticket.start_review()


@pytest.mark.django_db
def test_published_ticket_is_final(user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test Game",
        status=GameTicket.Status.PUBLISHED,
    )

    with pytest.raises(TransitionNotAllowed):
        ticket.start_review()
