"""
Tests pour l'endpoint GET /api/admin/reports/users/
Métriques détaillées utilisateurs pour les rapports planifiés.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from apps.users.models import UserSuspension
from apps.users.tests.constants import TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.mark.django_db
class TestAdminReportsUsersView:
    """Tests pour GET /api/admin/reports/users/."""

    def test_admin_can_retrieve_users_report_structure(self, auth_admin_client_with_tokens):
        """Réponse contient total, new, active, suspended."""
        url = "/api/admin/reports/users/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "total" in data
        assert "new" in data
        assert "active" in data
        assert "suspended" in data
        assert data["new"].keys() == {"day", "week", "month"}
        assert data["active"].keys() == {"day", "week", "month"}
        assert isinstance(data["total"], int)
        assert isinstance(data["suspended"], int)

    def test_users_report_values_match_aggregates(self, auth_admin_client_with_tokens, admin_user):
        """total, new, active, suspended sont cohérents avec la base."""
        cache.clear()  # éviter une réponse mise en cache par un test précédent
        now = timezone.now()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Utilisateur récent (new dans day/week/month)
        User.objects.create_user(
            email="newuser@example.com",
            password="TestPass123!",
            pseudo="newuser",
        )

        # Utilisateur actif (last_login récent)
        active_user = User.objects.create_user(
            email="active@example.com",
            password="TestPass123!",
            pseudo="activeuser",
        )
        active_user.last_login = now - timedelta(hours=6)
        active_user.save(update_fields=["last_login"])

        url = "/api/admin/reports/users/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        assert data["total"] == User.objects.count()
        assert data["new"]["day"] == User.objects.filter(created_at__gte=day_ago).count()
        assert data["new"]["week"] == User.objects.filter(created_at__gte=week_ago).count()
        assert data["new"]["month"] == User.objects.filter(created_at__gte=month_ago).count()
        assert data["active"]["day"] == User.objects.filter(last_login__gte=day_ago).count()
        assert data["active"]["week"] == User.objects.filter(last_login__gte=week_ago).count()
        assert data["active"]["month"] == User.objects.filter(last_login__gte=month_ago).count()

    def test_suspended_count_distinct_users(self, auth_admin_client_with_tokens, admin_user):
        """suspended = nombre d'utilisateurs ayant au moins une suspension active."""
        cache.clear()  # éviter une réponse mise en cache
        target = User.objects.create_user(
            email="tosuspend@example.com",
            password="TestPass123!",
            pseudo="tosuspend",
        )
        UserSuspension.objects.create(
            user=target,
            suspended_by=admin_user,
            reason="Test",
            is_active=True,
        )

        url = "/api/admin/reports/users/"
        response = auth_admin_client_with_tokens.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["suspended"] >= 1
        now = timezone.now()
        expected = (
            UserSuspension.objects.filter(is_active=True).filter(Q(end_date__isnull=True) | Q(end_date__gt=now)).values("user").distinct().count()
        )
        assert response.data["suspended"] == expected

    def test_moderator_can_access_reports_users(self, api_client, moderator_user):
        """Moderator a dashboard.view donc peut accéder à /api/admin/reports/users/."""
        login_url = "/api/auth/login/"
        login_response = api_client.post(
            login_url,
            {"email": moderator_user.email, "password": TEST_USER_CREDENTIAL},
            format="json",
        )
        assert login_response.status_code == status.HTTP_200_OK
        if "access_token" in login_response.cookies:
            api_client.cookies["access_token"] = login_response.cookies["access_token"].value
        if "refresh_token" in login_response.cookies:
            api_client.cookies["refresh_token"] = login_response.cookies["refresh_token"].value

        response = api_client.get("/api/admin/reports/users/")
        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_access_reports_users(self, auth_client_with_tokens):
        """Utilisateur sans rôle admin reçoit 403."""
        response = auth_client_with_tokens.get("/api/admin/reports/users/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(ADMIN_REPORTS_USERS_CACHE_TIMEOUT=60)
    def test_reports_users_uses_cache(self, auth_admin_client_with_tokens, admin_user):
        """Avec cache activé, le second appel renvoie les données en cache."""
        cache.clear()
        url = "/api/admin/reports/users/"

        response1 = auth_admin_client_with_tokens.get(url)
        assert response1.status_code == status.HTTP_200_OK
        data1 = response1.data

        # Nouveau user après premier appel
        User.objects.create_user(
            email="aftercache@example.com",
            password="TestPass123!",
            pseudo="aftercache",
        )

        response2 = auth_admin_client_with_tokens.get(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data == data1
        assert response2.data["total"] == data1["total"]

    def test_moderator_cannot_export_users_csv(self, api_client, moderator_user):
        """Export réservé admin/superadmin : moderator reçoit 403 sur ?export=csv."""
        api_client.force_authenticate(user=moderator_user)
        response = api_client.get("/api/admin/reports/users/?export=csv")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_moderator_cannot_export_users_pdf(self, api_client, moderator_user):
        """Export PDF réservé admin/superadmin : moderator reçoit 403 sur ?export=pdf (l.268)."""
        api_client.force_authenticate(user=moderator_user)
        response = api_client.get("/api/admin/reports/users/?export=pdf")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_export_users_csv(self, auth_admin_client_with_tokens):
        """Admin peut télécharger le rapport users en CSV (cache vide → payload puis return export, l.313)."""
        cache.clear()
        response = auth_admin_client_with_tokens.get("/api/admin/reports/users/?export=csv")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response.get("Content-Type", "")
        assert "attachment" in response.get("Content-Disposition", "")
        assert b"metric" in response.content or "metric" in response.content.decode("utf-8")

    def test_admin_can_export_users_pdf(self, auth_admin_client_with_tokens):
        """Admin peut télécharger le rapport users en PDF."""
        response = auth_admin_client_with_tokens.get("/api/admin/reports/users/?export=pdf")
        assert response.status_code == status.HTTP_200_OK
        assert "application/pdf" in response.get("Content-Type", "")
        assert "attachment" in response.get("Content-Disposition", "")
        assert response.content[:4] == b"%PDF"

    @override_settings(ADMIN_REPORTS_USERS_CACHE_TIMEOUT=60)
    def test_export_csv_from_cache(self, auth_admin_client_with_tokens):
        """Export CSV avec cache pré-rempli : _handle_users_export avec cached_data (lignes 309-314, 265)."""
        cache.clear()
        auth_admin_client_with_tokens.get("/api/admin/reports/users/")  # remplit le cache
        response = auth_admin_client_with_tokens.get("/api/admin/reports/users/?export=csv")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response.get("Content-Type", "")
        assert b"metric" in response.content

    @override_settings(ADMIN_REPORTS_USERS_CACHE_TIMEOUT=60)
    def test_export_pdf_from_cache(self, auth_admin_client_with_tokens):
        """Export PDF avec cache pré-rempli (lignes 309-314, 270)."""
        cache.clear()
        auth_admin_client_with_tokens.get("/api/admin/reports/users/")
        response = auth_admin_client_with_tokens.get("/api/admin/reports/users/?export=pdf")
        assert response.status_code == status.HTTP_200_OK
        assert "application/pdf" in response.get("Content-Type", "")
        assert response.content[:4] == b"%PDF"
