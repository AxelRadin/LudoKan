import pytest

from apps.game_tickets.models import GameTicket


@pytest.mark.django_db
def test_user_only_sees_his_tickets(api_client, user, another_user):
    ticket1 = GameTicket.objects.create(user=user, game_name="Game A")
    ticket2 = GameTicket.objects.create(user=another_user, game_name="Game B")

    api_client.force_authenticate(user=user)
    response = api_client.get("/api/game-tickets/")

    assert response.status_code == 200
    ids = [item["id"] for item in response.data["results"]]

    assert ticket1.id in ids
    assert ticket2.id not in ids
