import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.game_tickets.models import GameTicket

User = get_user_model()


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(
        email="admin@example.com",
        pseudo="admin",
        password="password123",
        is_staff=True,
    )


@pytest.fixture
def normal_user():
    return User.objects.create_user(
        email="user@example.com",
        pseudo="user",
        password="password123",
    )


@pytest.fixture
def ticket(normal_user):
    return GameTicket.objects.create(
        user=normal_user,
        game_name="Super Mario Bros",
        description="A classic platformer game.",
        publisher="Nintendo",
        year=1985,
        players="1-2",
        age=3,
        status=GameTicket.Status.PENDING,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
class TestAdminTicketHistoryAndCommentsAPI:
    def test_history_creation_on_status_change(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)

        # Passer en REVIEWING
        response = api_client.post(f"/api/admin/game-tickets/{ticket.id}/start-review/")
        assert response.status_code == status.HTTP_200_OK

        # Récupérer l'historique
        history_response = api_client.get(f"/api/admin/game-tickets/{ticket.id}/history/")
        assert history_response.status_code == status.HTTP_200_OK
        data = history_response.json()["results"]

        assert len(data) == 1
        assert data[0]["old_state"] == GameTicket.Status.PENDING
        assert data[0]["new_state"] == GameTicket.Status.REVIEWING
        assert data[0]["actor_pseudo"] == admin_user.pseudo

        # Rejeter le ticket
        response = api_client.post(
            f"/api/admin/game-tickets/{ticket.id}/reject/",
            data={"rejection_reason": "Not enough info"},
        )
        assert response.status_code == status.HTTP_200_OK

        # Récupérer l'historique à nouveau
        history_response = api_client.get(f"/api/admin/game-tickets/{ticket.id}/history/")
        assert history_response.status_code == status.HTTP_200_OK
        data = history_response.json()["results"]

        assert len(data) == 2
        # Rappel : le tri est par created_at décroissant
        assert data[0]["old_state"] == GameTicket.Status.REVIEWING
        assert data[0]["new_state"] == GameTicket.Status.REJECTED
        assert data[0]["comment"] == "Not enough info"

    def test_admin_can_add_and_list_comments(self, api_client, admin_user, ticket):
        api_client.force_authenticate(user=admin_user)

        # Ajouter un commentaire
        response = api_client.post(
            f"/api/admin/game-tickets/{ticket.id}/comments/",
            data={"comment": "Ce jeu a l'air sympa, je vérifie les infos."},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["comment"] == "Ce jeu a l'air sympa, je vérifie les infos."
        assert response.json()["author_pseudo"] == admin_user.pseudo

        # Lister les commentaires
        list_response = api_client.get(f"/api/admin/game-tickets/{ticket.id}/comments/")
        assert list_response.status_code == status.HTTP_200_OK
        data = list_response.json()["results"]

        assert len(data) == 1
        assert data[0]["comment"] == "Ce jeu a l'air sympa, je vérifie les infos."
        assert data[0]["author_pseudo"] == admin_user.pseudo

    def test_normal_user_cannot_access_endpoints(self, api_client, normal_user, ticket):
        api_client.force_authenticate(user=normal_user)

        response = api_client.get(f"/api/admin/game-tickets/{ticket.id}/history/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

        response = api_client.get(f"/api/admin/game-tickets/{ticket.id}/comments/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

        response = api_client.post(
            f"/api/admin/game-tickets/{ticket.id}/comments/",
            data={"comment": "Test"},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
