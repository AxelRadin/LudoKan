import pytest

from apps.game_tickets.models import GameTicket
from apps.game_tickets.serializers import AdminGameTicketUpdateSerializer


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
