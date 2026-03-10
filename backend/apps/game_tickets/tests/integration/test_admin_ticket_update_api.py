import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient

from apps.game_tickets.models import GameTicket

User = get_user_model()


@pytest.mark.django_db
class TestAdminGameTicketWorkflow:
    """Tests pour les endpoints de transition de workflow admin."""

    def setup_method(self):
        self.client = APIClient()

        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            pseudo="admin",
            password="admin123",
        )
        self.user = User.objects.create_user(
            email="user@test.com",
            pseudo="user",
            password="user123",
        )

        self.ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Test Game",
            status=GameTicket.Status.REVIEWING,
        )

    def test_admin_approve_success(self):
        """Vérifie l'approbation réussie et l'horodatage."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(f"/api/admin/game-tickets/{self.ticket.id}/approve/")

        assert response.status_code == status.HTTP_200_OK

        ticket_db = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket_db.status == GameTicket.Status.APPROVED
        assert ticket_db.reviewer == self.admin
        assert ticket_db.reviewed_at is not None

    def test_admin_reject_success(self):
        """Vérifie le rejet avec raison obligatoire."""
        self.client.force_authenticate(user=self.admin)
        reason = "Informations incomplètes"

        response = self.client.post(
            f"/api/admin/game-tickets/{self.ticket.id}/reject/",
            {"rejection_reason": reason},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        ticket_db = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket_db.status == GameTicket.Status.REJECTED
        assert ticket_db.rejection_reason == reason
        assert ticket_db.reviewed_at is not None

    def test_reject_missing_reason(self):
        """Vérifie que la 400 est levée si la raison manque."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f"/api/admin/game-tickets/{self.ticket.id}/reject/",
            {},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

        assert "rejection_reason" in str(response.data)

    def test_admin_publish_success(self):
        """Vérifie le passage de APPROVED à PUBLISHED."""

        GameTicket.objects.filter(pk=self.ticket.id).update(status=GameTicket.Status.APPROVED)

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/admin/game-tickets/{self.ticket.id}/publish/")

        assert response.status_code == status.HTTP_200_OK
        ticket_db = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket_db.status == GameTicket.Status.PUBLISHED

    def test_approve_invalid_transition(self):
        """Vérifie qu'on ne peut pas approuver un ticket PENDING (doit être REVIEWING)."""
        pending_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Pending Game",
            status=GameTicket.Status.PENDING,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(f"/api/admin/game-tickets/{pending_ticket.id}/approve/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthorized_user(self):
        """Vérifie qu'un utilisateur non-staff est rejeté."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f"/api/admin/game-tickets/{self.ticket.id}/approve/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_start_review_invalid_transition(self):
        """PENDING -> REVIEWING : échoue si déjà REVIEWING."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/admin/game-tickets/{self.ticket.id}/start-review/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reject_invalid_transition(self):
        """REVIEWING -> REJECTED : échoue si PENDING."""
        pending_ticket = GameTicket.objects.create(user=self.user, game_name="Pending", status=GameTicket.Status.PENDING)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/admin/game-tickets/{pending_ticket.id}/reject/", {"rejection_reason": "test"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_publish_invalid_transition(self):
        """APPROVED -> PUBLISHED : échoue si REVIEWING."""

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/admin/game-tickets/{self.ticket.id}/publish/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_all_endpoints_404(self):
        self.client.force_authenticate(user=self.admin)

        for action in ["approve", "publish", "start-review"]:
            response = self.client.post(f"/api/admin/game-tickets/99999/{action}/")
            assert response.status_code == status.HTTP_404_NOT_FOUND, f"Failed on {action}"

        response = self.client.post("/api/admin/game-tickets/99999/reject/", {"rejection_reason": "Any reason"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_list_filters(self):
        self.client.force_authenticate(user=self.admin)

        GameTicket.objects.create(user=self.user, game_name="Other Game", status=GameTicket.Status.PENDING)

        response = self.client.get("/api/admin/tickets/?status=pending")
        assert len(response.data["results"]) == 1

        response = self.client.get("/api/admin/tickets/?game_name=Test")
        assert len(response.data["results"]) == 1

    def test_admin_list_all_filters_coverage(self):
        self.client.force_authenticate(user=self.admin)
        url = "/api/admin/tickets/"
        params = {"status": "reviewing", "user_id": self.user.id, "game_name": "Test", "created_before": "2026-12-31", "created_after": "2020-01-01"}
        response = self.client.get(url, params)
        assert response.status_code == status.HTTP_200_OK

    def test_upload_attachment_wrong_user(self):
        other_user = User.objects.create_user(email="other@test.com", password="pass", pseudo="other")
        self.client.force_authenticate(user=other_user)

        file = SimpleUploadedFile("test.png", b"\x00\x00", content_type="image/png")

        response = self.client.post(f"/api/game-tickets/{self.ticket.id}/attachments/", {"file": file}, format="multipart")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "You cannot upload files for this ticket." in str(response.data)

    def test_admin_patch_not_found(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch("/api/admin/game-tickets/99999/", {"internal_comment": "hello"}, format="json")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_patch_invalid_status(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(f"/api/admin/game-tickets/{self.ticket.id}/", {"status": "approved"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "status" in response.data.get("errors", {})

    def test_upload_attachment_wrong_user_full_coverage(self):
        """Couvre lignes 119-131 : perform_create check."""

        other_user = User.objects.create_user(email="hacker@test.com", password="pass", pseudo="hacker")
        self.client.force_authenticate(user=other_user)

        file = SimpleUploadedFile("image.png", b"content", content_type="image/png")

        url = f"/api/game-tickets/{self.ticket.id}/attachments/"
        response = self.client.post(url, {"file": file}, format="multipart")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "You cannot upload files for this ticket." in str(response.data)

    def test_admin_patch_not_found_coverage(self):
        """Couvre lignes 400-402 : Le cas 404 du UpdateAPIView."""
        self.client.force_authenticate(user=self.admin)

        url = "/api/admin/game-tickets/999999/"
        response = self.client.patch(url, {"internal_comment": "test"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_start_review_success(self):
        """Couvre lignes 119-131 : transition de PENDING à REVIEWING."""
        pending_ticket = GameTicket.objects.create(
            user=self.user,
            game_name="Pending Game success",
            status=GameTicket.Status.PENDING,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f"/api/admin/game-tickets/{pending_ticket.id}/start-review/")

        assert response.status_code == status.HTTP_200_OK

        ticket_db = GameTicket.objects.get(pk=pending_ticket.id)
        assert ticket_db.status == GameTicket.Status.REVIEWING
        assert ticket_db.reviewer == self.admin

    def test_admin_patch_success(self):
        """Couvre lignes 394-396 : mise à jour réussie des données internes d'un ticket."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            f"/api/admin/game-tickets/{self.ticket.id}/",
            {"internal_comment": "Nouveau commentaire interne valide"},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        ticket_db = GameTicket.objects.get(pk=self.ticket.id)
        assert ticket_db.internal_comment == "Nouveau commentaire interne valide"
