from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from apps.chat.models import ChatRoom, Message
from apps.games.models import Game, Publisher, Rating
from apps.reviews.models import Review
from apps.support.models import SupportTicket
from apps.users.models import AdminAction
from apps.users.tests.constants import RECAPTCHA_POST_FIELD, TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.mark.django_db
class TestAdminStatsView:
    """Tests pour l'endpoint GET /api/admin/stats/."""

    def test_admin_can_retrieve_global_stats_recent_activity_and_engagement(self, auth_admin_client_with_tokens, admin_user):
        # Créer des données supplémentaires pour chaque entité comptabilisée
        publisher = Publisher.objects.create(name="Test Publisher")
        game = Game.objects.create(name="Test Game", publisher=publisher)

        # Ticket support lié à un utilisateur
        SupportTicket.objects.create(
            user=admin_user,
            category=SupportTicket.Category.BUG,
            subject="Bug test",
            body="Description suffisamment longue pour le test.",
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
        AdminAction.objects.create(
            admin_user=admin_user,
            action_type="user.suspend",
            target_type="user",
            target_id=admin_user.id,
            description="Suspension utilisateur",
        )
        AdminAction.objects.create(
            admin_user=admin_user,
            action_type="system.maintenance",
            target_type="",
            target_id=None,
            description="System maintenance action",
        )

        url = "/api/admin/stats/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "totals" in response.data
        assert "engagement" in response.data
        assert "recent_activity" in response.data
        assert "charts" in response.data

        totals = response.data["totals"]

        assert totals["users"] == User.objects.count()
        assert totals["games"] == Game.objects.count()
        assert totals["support_tickets"] == SupportTicket.objects.count()
        assert totals["reviews"] == Review.objects.count()

        engagement = response.data["engagement"]
        assert "active_day" in engagement
        assert "active_week" in engagement
        assert "active_month" in engagement
        assert "reviews_last_30d" in engagement
        assert "ratings_last_30d" in engagement
        assert "messages_last_30d" in engagement

        recent_activity = response.data["recent_activity"]
        # On a créé au moins 2 actions, vérifier qu'elles sont présentes et correctement mappées
        assert len(recent_activity) >= 2

        # La première entrée doit correspondre à la dernière action créée (timestamp DESC)
        first = recent_activity[0]
        assert "id" in first
        assert first["action"] == "system_maintenance"
        assert first["actor"] == admin_user.pseudo
        assert first["target"] is None

        # La seconde correspond à la suspension de l'admin
        second = recent_activity[1]
        assert second["action"] == "user_suspend"
        assert second["actor"] == admin_user.pseudo
        assert second["target"] == admin_user.pseudo

        # Une autre entrée doit correspondre à la suppression de review
        found_review_action = any(
            item["action"] == "review_delete" and item["target"] == f"review#{action1.target_id}" and item["actor"] == admin_user.pseudo
            for item in recent_activity
        )
        assert found_review_action

        charts = response.data["charts"]
        assert len(charts["users_daily"]) == 14
        for row in charts["users_daily"]:
            assert "date" in row and "new_users" in row and "active_logins" in row
        assert isinstance(charts["games_top"], list)
        assert isinstance(charts["genres_share"], list)

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
        charts = response.data["charts"]
        assert len(charts["users_daily"]) == 14
        assert len(recent_activity) == 20

        # Vérifier que les IDs les plus récents (créés en dernier) sont présents
        latest_ids = {item["target"].split("#")[1] for item in recent_activity if item["target"]}
        # On s'attend à voir au moins les plus gros IDs (ex: 29, 28, ...)
        assert "29" in latest_ids
        assert "28" in latest_ids

    def test_engagement_user_activity_and_content_metrics(self, auth_admin_client_with_tokens, admin_user):
        """
        Vérifie que les métriques d'engagement renvoient des valeurs cohérentes
        pour les utilisateurs actifs et le contenu récent.
        """
        now = timezone.now()

        # Créer des utilisateurs avec des last_login dans différentes fenêtres temporelles
        user_day = User.objects.create_user(
            email="active_day@example.com",
            password="TestPass123!",
            pseudo="active_day",
        )
        user_day.last_login = now - timedelta(hours=12)
        user_day.save(update_fields=["last_login"])

        user_week = User.objects.create_user(
            email="active_week@example.com",
            password="TestPass123!",
            pseudo="active_week",
        )
        user_week.last_login = now - timedelta(days=3)
        user_week.save(update_fields=["last_login"])

        user_month = User.objects.create_user(
            email="active_month@example.com",
            password="TestPass123!",
            pseudo="active_month",
        )
        user_month.last_login = now - timedelta(days=20)
        user_month.save(update_fields=["last_login"])

        # Un utilisateur plus ancien que 30 jours ne doit pas être compté
        user_old = User.objects.create_user(
            email="inactive@example.com",
            password="TestPass123!",
            pseudo="inactive_user",
        )
        user_old.last_login = now - timedelta(days=40)
        user_old.save(update_fields=["last_login"])

        # Créer un publisher / game pour rattacher ratings & reviews
        publisher = Publisher.objects.create(name="Engagement Publisher")
        game = Game.objects.create(name="Engagement Game", publisher=publisher)

        # Reviews récentes (dans les 30 derniers jours)
        Review.objects.create(user=admin_user, game=game, content="Review récente 1")
        Review.objects.create(user=user_day, game=game, content="Review récente 2")

        # Rating récents
        Rating.objects.create(
            user=admin_user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )

        # Messages récents (chat)
        room = ChatRoom.objects.create()
        room.members.add(admin_user, user_day)
        Message.objects.create(room=room, user=admin_user, content="Hello")
        Message.objects.create(room=room, user=user_day, content="World")

        url = "/api/admin/stats/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        engagement = response.data["engagement"]

        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Vérifier la cohérence des métriques utilisateurs
        assert engagement["active_day"] == User.objects.filter(last_login__gte=day_ago).count()
        assert engagement["active_week"] == User.objects.filter(last_login__gte=week_ago).count()
        assert engagement["active_month"] == User.objects.filter(last_login__gte=month_ago).count()

        # Vérifier la cohérence des métriques de contenu
        assert engagement["reviews_last_30d"] == Review.objects.filter(date_created__gte=month_ago).count()
        assert engagement["ratings_last_30d"] == Rating.objects.filter(date_created__gte=month_ago).count()
        assert engagement["messages_last_30d"] == Message.objects.filter(created_at__gte=month_ago).count()

    def test_moderator_can_access_stats(self, api_client, moderator_user):
        """
        Les utilisateurs avec rôle MODERATOR doivent pouvoir accéder au dashboard
        grâce à la permission métier "dashboard.view".
        """
        login_url = "/api/auth/login/"
        login_response = api_client.post(
            login_url,
            {"email": moderator_user.email, "password": TEST_USER_CREDENTIAL, **RECAPTCHA_POST_FIELD},
            format="json",
        )

        assert login_response.status_code == status.HTTP_200_OK

        # Propager les cookies JWT dans le client
        if "access_token" in login_response.cookies:
            api_client.cookies["access_token"] = login_response.cookies["access_token"].value
        if "refresh_token" in login_response.cookies:
            api_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        url = "/api/admin/stats/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_access_stats(self, auth_client_with_tokens):
        url = "/api/admin/stats/"
        response = auth_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(ADMIN_STATS_CACHE_TIMEOUT=60)
    def test_admin_stats_uses_cache(self, auth_admin_client_with_tokens, admin_user):
        """
        Vérifie que le cache est bien utilisé quand ADMIN_STATS_CACHE_TIMEOUT > 0.
        """
        cache.clear()
        url = "/api/admin/stats/"

        # Premier appel : pas de donnée en cache, on calcule et on stocke
        response1 = auth_admin_client_with_tokens.get(url)
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.data

        # Modifier les données après le premier appel
        AdminAction.objects.create(
            admin_user=admin_user,
            action_type="user.suspend",
            target_type="user",
            target_id=999,
            description="Action après premier calcul",
        )

        # Second appel : doit renvoyer les données du cache, donc identiques à data1
        response2 = auth_admin_client_with_tokens.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data == data1


@pytest.mark.django_db
class TestAdminStatsInsightsView:
    def test_admin_can_fetch_stats_insights(self, auth_admin_client_with_tokens, admin_user):
        publisher = Publisher.objects.create(name="Pub Insights")
        game = Game.objects.create(name="G Insights", publisher=publisher)
        Review.objects.create(
            user=admin_user,
            game=game,
            content="Contenu assez long pour la validation des avis.",
        )

        url = "/api/admin/stats/insights/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "reviews_ratings_daily" in data
        assert len(data["reviews_ratings_daily"]) == 30
        assert "reports_messages_daily" in data
        assert len(data["reports_messages_daily"]) == 14
        assert "support_by_status" in data
        assert isinstance(data["support_by_status"], list)
        assert "games_by_status" in data
        assert isinstance(data["games_by_status"], list)

    def test_non_admin_cannot_fetch_stats_insights(self, auth_client_with_tokens):
        response = auth_client_with_tokens.get("/api/admin/stats/insights/")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestAdminStatsCoverageHelpers:
    """Tests spécifiques pour couvrir les branches des helpers de stats (AdminStatsView)."""

    def test_get_charts_data_branches(self):
        from apps.users.views import AdminStatsView

        view = AdminStatsView()
        now_aware = timezone.now()
        now_naive = datetime.now()

        with patch("apps.users.views.User.objects.filter") as mock_filter:
            mock_qs = MagicMock()
            mock_filter.return_value = mock_qs
            mock_qs.annotate.return_value = mock_qs
            mock_qs.values.return_value = mock_qs

            test_data = [
                {"day": None, "count": 1},
                {"day": timezone.now(), "count": 2},
                {"day": datetime.now(), "count": 3},
                {"day": "2023-01-01", "count": 4},
                {"day": date(2023, 1, 1), "count": 5},
            ]
            mock_qs.__iter__.return_value = iter(test_data)

            # Couvre la branche timezone.is_aware(now)
            view._get_charts_data(now_aware)
            # Couvre la branche else (naive now) -> lignes 291-292
            view._get_charts_data(now_naive)

    def test_admin_stats_insight_as_date_coverage(self):
        """Couvre les branches de _admin_stats_insight_as_date -> lignes 368-374."""
        from apps.users.views import _admin_stats_insight_as_date

        assert _admin_stats_insight_as_date(None) is None
        aware_dt = timezone.now()
        assert isinstance(_admin_stats_insight_as_date(aware_dt), date)
        naive_dt = datetime.now()
        assert isinstance(_admin_stats_insight_as_date(naive_dt), date)
        d = date(2023, 1, 1)
        assert _admin_stats_insight_as_date(d) == d
        assert _admin_stats_insight_as_date("string") == "string"
