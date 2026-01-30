import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

from apps.game_tickets.models import GameTicket
from apps.games.models import Game, Publisher
from apps.reviews.models import Review

User = get_user_model()


@pytest.mark.django_db
class TestAdminStatsView:
    """Tests pour l'endpoint GET /api/admin/stats/."""

    def test_admin_can_retrieve_global_stats(self, auth_admin_client_with_tokens, admin_user):
        # Créer des données supplémentaires pour chaque entité comptabilisée
        publisher = Publisher.objects.create(name="Test Publisher")
        game = Game.objects.create(name="Test Game", publisher=publisher)

        # Ticket lié à un utilisateur
        GameTicket.objects.create(
            user=admin_user,
            game_name="Requested Game",
            description="Test ticket",
        )

        # Review liée au jeu
        Review.objects.create(
            user=admin_user,
            game=game,
            content="Avis de test suffisamment long",
        )

        url = "/api/admin/stats/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "totals" in response.data

        totals = response.data["totals"]

        assert totals["users"] == User.objects.count()
        assert totals["games"] == Game.objects.count()
        assert totals["tickets"] == GameTicket.objects.count()
        assert totals["reviews"] == Review.objects.count()

    def test_non_admin_cannot_access_stats(self, auth_client_with_tokens):
        url = "/api/admin/stats/"
        response = auth_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
