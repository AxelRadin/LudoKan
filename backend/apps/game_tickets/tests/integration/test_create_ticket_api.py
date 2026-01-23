import pytest
from rest_framework import status


@pytest.mark.django_db
def test_create_game_ticket_authenticated(authenticated_api_client, genre, platform):
    payload = {
        "game_name": "New Game",
        "year": 2024,
        "genres": [genre.id],
        "platforms": [platform.id],
    }

    response = authenticated_api_client.post(
        "/api/game-tickets/create/",
        payload,
        format="json",
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == "pending"
    assert "id" in response.data


@pytest.mark.django_db
def test_create_game_ticket_unauthenticated(api_client):
    response = api_client.post("/api/game-tickets/create/", {"game_name": "Test"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
