import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.game_tickets.models import GameTicket
from apps.users.models import AdminAction

User = get_user_model()


@pytest.mark.django_db
class TestAdminGameTicketUpdateAPI:
    """Tests for admin ticket update endpoints."""

    def setup_method(self):
        self.client = APIClient()

        # Créer un admin
        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            pseudo="admin",
            password="admin123",
        )

        # Créer un modérateur
        self.moderator = User.objects.create_user(
            email="moderator@test.com",
            pseudo="moderator",
            password="mod123",
        )

        # Créer un user normal
        self.user = User.objects.create_user(
            email="user@test.com",
            pseudo="user",
            password="user123",
        )

        # Créer un ticket REVIEWING
        self.ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Test Game",
            description="A test game",
            status=GameTicket.Status.REVIEWING,
        )

    def test_admin_can_patch_metadata(self):
        """Admin peut updater internal_comment, internal_note, admin_metadata."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "internal_comment": "Looks good",
                "internal_note": "Approved by admin",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.internal_comment == "Looks good"

    def test_admin_cannot_modify_status_directly(self):
        """Admin ne peut pas updater status directement."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "status": GameTicket.Status.APPROVED,
            },
            format="json",
        )

        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK]
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.status == GameTicket.Status.REVIEWING

    def test_admin_approve_via_fsm_action(self):
        """Admin approuve via l'action FSM."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{self.ticket.id}/approve/",
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.status == GameTicket.Status.APPROVED
        assert ticket.reviewer == self.admin

    def test_admin_reject_via_fsm_action(self):
        """Admin rejette via l'action FSM avec raison."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{self.ticket.id}/reject/",
            {
                "rejection_reason": "Duplicate game",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.status == GameTicket.Status.REJECTED
        assert ticket.rejection_reason == "Duplicate game"
        assert ticket.reviewer == self.admin

    def test_admin_start_review_success(self):
        """Admin peut passer un ticket PENDING en REVIEWING."""
        pending_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Pending Game",
            description="Waiting",
            status=GameTicket.Status.PENDING,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{pending_ticket.id}/start-review/",
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        pending_ticket = GameTicket.objects.get(pk=pending_ticket.id)
        assert pending_ticket.status == GameTicket.Status.REVIEWING
        assert pending_ticket.reviewer == self.admin

    def test_start_review_not_found(self):
        """start-review renvoie 404 si le ticket n'existe pas."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            "/api/game-tickets/999999/start-review/",
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get("detail") == "Ticket not found."

    def test_start_review_invalid_transition(self):
        """start-review renvoie 400 si le ticket n'est pas PENDING."""
        self.client.force_authenticate(user=self.admin)
        # self.ticket est déjà en REVIEWING

        response = self.client.post(
            f"/api/game-tickets/{self.ticket.id}/start-review/",
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "PENDING" in response.data.get("detail", "")

    def test_approve_not_found(self):
        """approve renvoie 404 si le ticket n'existe pas."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            "/api/game-tickets/999999/approve/",
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get("detail") == "Ticket not found."

    def test_approve_invalid_transition(self):
        """approve renvoie 400 si le ticket n'est pas en REVIEWING."""
        pending_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Pending",
            description="",
            status=GameTicket.Status.PENDING,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{pending_ticket.id}/approve/",
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "REVIEWING" in response.data.get("detail", "")

    def test_reject_not_found(self):
        """reject renvoie 404 si le ticket n'existe pas."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            "/api/game-tickets/999999/reject/",
            {"rejection_reason": "N/A"},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get("detail") == "Ticket not found."

    def test_reject_invalid_transition(self):
        """reject renvoie 400 si le ticket n'est pas en REVIEWING."""
        pending_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Pending",
            description="",
            status=GameTicket.Status.PENDING,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{pending_ticket.id}/reject/",
            {"rejection_reason": "Not applicable"},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "REVIEWING" in response.data.get("detail", "")

    def test_admin_publish_success(self):
        """Admin peut passer un ticket APPROVED en PUBLISHED."""
        approved_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Approved Game",
            description="",
            status=GameTicket.Status.APPROVED,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/game-tickets/{approved_ticket.id}/publish/",
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        approved_ticket = GameTicket.objects.get(pk=approved_ticket.id)
        assert approved_ticket.status == GameTicket.Status.PUBLISHED

    def test_publish_not_found(self):
        """publish renvoie 404 si le ticket n'existe pas."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            "/api/game-tickets/999999/publish/",
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data.get("detail") == "Ticket not found."

    def test_publish_invalid_transition(self):
        """publish renvoie 400 si le ticket n'est pas APPROVED."""
        self.client.force_authenticate(user=self.admin)
        # self.ticket est en REVIEWING

        response = self.client.post(
            f"/api/game-tickets/{self.ticket.id}/publish/",
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "APPROVED" in response.data.get("detail", "")

    def test_normal_user_cannot_patch_ticket(self):
        """User normal ne peut pas updater le ticket."""
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "internal_comment": "Hacked",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_moderator_cannot_patch_ticket(self):
        """Modérateur ne peut pas updater ticket d'autre user."""
        self.client.force_authenticate(user=self.moderator)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "internal_comment": "Unauthorized",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patch_partial_update(self):
        """PATCH ne touch que les champs fournis."""
        self.client.force_authenticate(user=self.admin)
        original_note = self.ticket.internal_note

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "internal_comment": "Updated comment only",
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.internal_comment == "Updated comment only"
        assert ticket.internal_note == original_note

    def test_patch_does_not_trigger_fsm(self):
        """PATCH metadata n'affecte pas le status."""
        self.client.force_authenticate(user=self.admin)
        original_status = self.ticket.status

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {
                "admin_metadata": {"key": "value"},
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        ticket = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket.status == original_status

    def test_admin_patch_ticket_not_found(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            "/api/game-tickets/999999/",
            {"internal_comment": "test"},
            format="json",
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_patch_rejects_status_field(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {"status": GameTicket.Status.APPROVED},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_creates_admin_log(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {"internal_comment": "Logged change"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        assert AdminAction.objects.filter(
            action_type="ticket.update_internal",
            target_id=self.ticket.id,
        ).exists()

    def test_admin_patch_empty_payload(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

    def test_patch_staff_without_permission(self):
        staff = User.objects.create_user(
            email="staff@test.com",
            pseudo="staff",
            password="staff",
            is_staff=True,
        )

        self.client.force_authenticate(user=staff)

        response = self.client.patch(
            f"/api/game-tickets/{self.ticket.id}/",
            {"internal_comment": "fail"},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
