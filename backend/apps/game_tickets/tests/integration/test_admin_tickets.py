from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.game_tickets.models import GameTicket
from apps.users.models import AdminAction, UserRole
from apps.users.tests.constants import TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(
        email="admintickets@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="admintickets",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_client(db):
    user = User.objects.create_user(
        email="modtickets@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="modtickets",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def authenticated_client(db):
    user = User.objects.create_user(
        email="normaltickets@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="normaltickets",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAdminGameTicketListView:
    def test_admin_can_list_tickets_with_filters(self, admin_client, user):
        ticket1 = GameTicket.objects.create(user=user, game_name="Requested Game 1", status=GameTicket.Status.PENDING)
        GameTicket.objects.create(user=user, game_name="Requested Game 2", status=GameTicket.Status.REVIEWING)

        url = "/api/admin/tickets/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert response.data["count"] >= 2

        # Filtre par status
        resp_pending = admin_client.get(url, {"status": GameTicket.Status.PENDING})
        assert resp_pending.status_code == status.HTTP_200_OK
        ids = {item["id"] for item in resp_pending.data["results"]}
        assert ticket1.id in ids

    def test_moderator_can_list_tickets(self, moderator_client, user):
        GameTicket.objects.create(user=user, game_name="Mod visible ticket", status=GameTicket.Status.PENDING)

        url = "/api/admin/tickets/"
        response = moderator_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_list_tickets(self, authenticated_client, user):
        GameTicket.objects.create(user=user, game_name="Protected ticket", status=GameTicket.Status.PENDING)

        url = "/api/admin/tickets/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_ticket_list_additional_filters(self, admin_client, user):
        t1 = GameTicket.objects.create(user=user, game_name="Filter Game", status=GameTicket.Status.PENDING)
        GameTicket.objects.create(user=user, game_name="Other Game", status=GameTicket.Status.REVIEWING)

        base_url = "/api/admin/tickets/"

        # Filtre par user_id
        resp_user = admin_client.get(base_url, {"user_id": user.id})
        assert resp_user.status_code == status.HTTP_200_OK

        # Filtre par game_name (icontains)
        resp_name = admin_client.get(base_url, {"game_name": "Filter"})
        assert resp_name.status_code == status.HTTP_200_OK
        ids = {item["id"] for item in resp_name.data["results"]}
        assert t1.id in ids

        # Filtres de date created_before / created_after
        now = timezone.now()
        before = (now + timedelta(days=1)).isoformat()
        after = (now - timedelta(days=1)).isoformat()
        resp_dates = admin_client.get(
            base_url,
            {"created_before": before, "created_after": after},
        )
        assert resp_dates.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestGameTicketStatusUpdateLogging:
    def test_staff_status_update_to_approved_creates_admin_action(self, authenticated_staff_api_client, user):
        ticket = GameTicket.objects.create(user=user, game_name="Status Ticket", status=GameTicket.Status.REVIEWING)

        url = f"/api/game-tickets/{ticket.id}/status/"
        response = authenticated_staff_api_client.post(
            url,
            {"status": GameTicket.Status.APPROVED},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        assert AdminAction.objects.filter(
            action_type="ticket.approve",
            target_type="game_ticket",
            target_id=ticket.id,
        ).exists()

    def test_staff_status_update_to_rejected_creates_admin_action(self, authenticated_staff_api_client, user):
        ticket = GameTicket.objects.create(user=user, game_name="Status Ticket", status=GameTicket.Status.REVIEWING)

        url = f"/api/game-tickets/{ticket.id}/status/"
        response = authenticated_staff_api_client.post(
            url,
            {"status": GameTicket.Status.REJECTED},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        assert AdminAction.objects.filter(
            action_type="ticket.reject",
            target_type="game_ticket",
            target_id=ticket.id,
        ).exists()
