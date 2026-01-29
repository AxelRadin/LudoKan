import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

from apps.game_tickets.models import GameTicket
from apps.games.models import Game, Publisher
from apps.reviews.models import Review
from apps.users.models import AdminAction

User = get_user_model()


@pytest.mark.django_db
class TestAdminStatsView:
    """Tests pour l'endpoint GET /api/admin/stats/."""

    def test_admin_can_retrieve_global_stats_and_recent_activity(self, auth_admin_client_with_tokens, admin_user):
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

        # Créer quelques AdminAction pour peupler l'activité récente
        action1 = AdminAction.objects.create(
            admin_user=admin_user,
            action_type="review.delete",
            target_type="review",
            target_id=42,
            description="Suppression de review",
        )
        action2 = AdminAction.objects.create(
            admin_user=admin_user,
            action_type="user.suspend",
            target_type="user",
            target_id=7,
            description="Suspension utilisateur",
        )

        url = "/api/admin/stats/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "totals" in response.data
        assert "recent_activity" in response.data

        totals = response.data["totals"]

        assert totals["users"] == User.objects.count()
        assert totals["games"] == Game.objects.count()
        assert totals["tickets"] == GameTicket.objects.count()
        assert totals["reviews"] == Review.objects.count()

        recent_activity = response.data["recent_activity"]
        # On a créé au moins 2 actions, vérifier qu'elles sont présentes et correctement mappées
        assert len(recent_activity) >= 2

        # La première entrée doit correspondre à la dernière action créée (timestamp DESC)
        first = recent_activity[0]
        assert first["action"] == "user_suspend"
        assert first["actor"] == admin_user.pseudo
        assert first["target"] == f"user#{action2.target_id}"
        assert "time" in first

        # Une autre entrée doit correspondre à la suppression de review
        found_review_action = any(
            item["action"] == "review_delete" and item["target"] == f"review#{action1.target_id}" and item["actor"] == admin_user.pseudo
            for item in recent_activity
        )
        assert found_review_action

    def test_recent_activity_is_limited_to_20_items(self, auth_admin_client_with_tokens, admin_user):
        # Créer plus de 20 AdminAction pour vérifier la limite
        for i in range(30):
            AdminAction.objects.create(
                admin_user=admin_user,
                action_type="review.delete",
                target_type="review",
                target_id=i,
                description=f"Suppression review {i}",
            )

        url = "/api/admin/stats/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "recent_activity" in response.data

        recent_activity = response.data["recent_activity"]
        assert len(recent_activity) == 20

        # Vérifier que les IDs les plus récents (créés en dernier) sont présents
        latest_ids = {item["target"].split("#")[1] for item in recent_activity if item["target"]}
        # On s'attend à voir au moins les plus gros IDs (ex: 29, 28, ...)
        assert "29" in latest_ids
        assert "28" in latest_ids

    def test_non_admin_cannot_access_stats(self, auth_client_with_tokens):
        url = "/api/admin/stats/"
        response = auth_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
