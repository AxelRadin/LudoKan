import pytest

from apps.game_tickets.models import GameTicket
from apps.game_tickets.serializers import AdminGameTicketUpdateSerializer, GameTicketStatusUpdateSerializer


@pytest.mark.django_db
def test_admin_update_serializer_valid(user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    serializer = AdminGameTicketUpdateSerializer(
        instance=ticket,
        data={
            "internal_comment": "Checked",
            "internal_note": "Duplicate suspected",
            "admin_metadata": {"priority": "high"},
        },
        partial=True,
    )

    assert serializer.is_valid()
    updated_ticket = serializer.save()

    assert updated_ticket.internal_comment == "Checked"
    assert updated_ticket.admin_metadata["priority"] == "high"


@pytest.mark.django_db
def test_admin_update_serializer_forbids_status(user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    serializer = AdminGameTicketUpdateSerializer(
        instance=ticket,
        data={"status": GameTicket.Status.APPROVED},
        partial=True,
    )

    assert not serializer.is_valid()
    assert "status" in serializer.errors


@pytest.mark.django_db
def test_update_serializer_strips_status(user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    serializer = AdminGameTicketUpdateSerializer(
        instance=ticket,
        data={
            "internal_comment": "Test",
            "status": GameTicket.Status.APPROVED,
        },
        partial=True,
    )

    assert not serializer.is_valid()


def test_status_update_serializer_reject_requires_rejection_reason():
    """rejection_reason est obligatoire quand action=reject."""
    serializer = GameTicketStatusUpdateSerializer(
        data={},
        context={"action": "reject"},
    )

    assert not serializer.is_valid()
    assert "rejection_reason" in serializer.errors
    assert "required" in str(serializer.errors["rejection_reason"]).lower()


def test_status_update_serializer_reject_valid_with_reason():
    """Avec action=reject et rejection_reason fourni, le serializer est valide."""
    serializer = GameTicketStatusUpdateSerializer(
        data={"rejection_reason": "Duplicate game"},
        context={"action": "reject"},
    )

    assert serializer.is_valid()
