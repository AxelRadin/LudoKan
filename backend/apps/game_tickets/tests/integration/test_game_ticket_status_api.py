import pytest
from rest_framework import status

from apps.game_tickets.models import GameTicket


@pytest.mark.django_db
def test_staff_can_update_ticket_status(authenticated_staff_api_client, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test",
        status=GameTicket.Status.PENDING,
    )

    response = authenticated_staff_api_client.post(
        f"/api/game-tickets/{ticket.id}/status/",
        {"status": GameTicket.Status.REVIEWING},
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == GameTicket.Status.REVIEWING


@pytest.mark.django_db
def test_non_staff_cannot_update_status(authenticated_api_client, user):
    ticket = GameTicket.objects.create(user=user, game_name="Test")

    response = authenticated_api_client.post(
        f"/api/game-tickets/{ticket.id}/status/",
        {"status": GameTicket.Status.REVIEWING},
        format="json",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_invalid_transition_returns_400(authenticated_staff_api_client, user):
    ticket = GameTicket.objects.create(
        user=user,
        game_name="Test",
        status=GameTicket.Status.PENDING,
    )

    response = authenticated_staff_api_client.post(
        f"/api/game-tickets/{ticket.id}/status/",
        {"status": GameTicket.Status.APPROVED},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid status transition" in response.data["detail"]


@pytest.mark.django_db
def test_missing_status_returns_400(staff_api_client, ticket):
    response = staff_api_client.post(
        f"/api/game-tickets/{ticket.id}/status/",
        {},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["success"] is False
    assert "status" in response.data["errors"]


@pytest.mark.django_db
def test_ticket_not_found(authenticated_staff_api_client):
    response = authenticated_staff_api_client.post(
        "/api/game-tickets/99999/status/",
        {"status": "reviewing"},
        format="json",
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
