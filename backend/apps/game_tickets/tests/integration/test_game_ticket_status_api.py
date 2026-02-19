import pytest
from rest_framework import status


@pytest.mark.django_db
def test_ticket_not_found(authenticated_staff_api_client):
    response = authenticated_staff_api_client.post(
        "/api/game-tickets/99999/status/",
        {"status": "reviewing"},
        format="json",
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
