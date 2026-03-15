"""
Tests pour l'endpoint GET /api/admin/reports/activity/ (BACK-021D).
Journal d'activité (ActivityLog + AdminAction) avec filtres.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status

from apps.core.models import ActivityLog
from apps.users.models import AdminAction, UserRole

User = get_user_model()


@pytest.fixture
def admin_user_with_role(db):
    """Admin avec rôle (dashboard.view) pour les tests."""
    user = User.objects.create_user(
        email="adminactivity@example.com",
        password="TestPass123!",
        pseudo="adminactivity",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    return user


@pytest.fixture
def moderator_user(db):
    """Moderator pour tests d'accès."""
    user = User.objects.create_user(
        email="modactivity@example.com",
        password="TestPass123!",
        pseudo="modactivity",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)
    return user


@pytest.fixture
def admin_client(api_client, admin_user_with_role):
    api_client.force_authenticate(user=admin_user_with_role)
    return api_client


@pytest.fixture
def moderator_client(api_client, moderator_user):
    api_client.force_authenticate(user=moderator_user)
    return api_client


@pytest.fixture
def normal_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestAdminReportsActivityView:
    """Tests pour GET /api/admin/reports/activity/."""

    def test_admin_can_retrieve_activity_structure(self, admin_client, user):
        """Réponse contient activity (liste) avec champs user, action, at."""
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        response = admin_client.get("/api/admin/reports/activity/")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "activity" in data
        assert isinstance(data["activity"], list)
        if data["activity"]:
            item = data["activity"][0]
            assert "user" in item
            assert "action" in item
            assert "at" in item

    def test_activity_includes_activity_log_and_admin_action(self, admin_client, user, admin_user_with_role):
        """Le journal fusionne ActivityLog et AdminAction, triés par date."""
        cache.clear()
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.REVIEW_POSTED)
        AdminAction.objects.create(
            admin_user=admin_user_with_role,
            action_type="user.suspend",
            target_type="user",
            target_id=user.id,
        )
        response = admin_client.get("/api/admin/reports/activity/")
        assert response.status_code == status.HTTP_200_OK
        activity = response.data["activity"]
        actions = {a["action"] for a in activity}
        assert "review_posted" in actions
        assert "user.suspend" in actions

    def test_activity_item_with_target(self, admin_client, user):
        """Une entrée avec target_type/target_id contient la clé target."""
        cache.clear()
        ActivityLog.objects.create(
            user=user,
            action=ActivityLog.Action.REVIEW_POSTED,
            target_type="review",
            target_id=42,
        )
        response = admin_client.get("/api/admin/reports/activity/")
        assert response.status_code == status.HTTP_200_OK
        activity = response.data["activity"]
        assert len(activity) >= 1
        item = next((a for a in activity if a.get("action") == "review_posted"), None)
        assert item is not None
        assert item.get("target") == "review#42"

    def test_filter_by_user(self, admin_client, user):
        """Filtre ?user=<id> ne renvoie que les entrées de cet utilisateur."""
        cache.clear()
        other = User.objects.create_user(email="other@example.com", password="x", pseudo="otheruser")
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        ActivityLog.objects.create(user=other, action=ActivityLog.Action.LOGIN)
        response = admin_client.get(f"/api/admin/reports/activity/?user={user.id}")
        assert response.status_code == status.HTTP_200_OK
        activity = response.data["activity"]
        assert all(a["user"] == user.pseudo for a in activity)

    def test_filter_by_action(self, admin_client, user):
        """Filtre ?action=login ne renvoie que les actions de ce type."""
        cache.clear()
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.REVIEW_POSTED)
        response = admin_client.get("/api/admin/reports/activity/?action=login")
        assert response.status_code == status.HTTP_200_OK
        activity = response.data["activity"]
        assert all(a["action"] == "login" for a in activity)

    def test_filter_by_period(self, admin_client, user):
        """Filtre ?period=24h limite à la dernière 24h."""
        cache.clear()
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        response_30d = admin_client.get("/api/admin/reports/activity/?period=30d")
        response_24h = admin_client.get("/api/admin/reports/activity/?period=24h")
        response_7d = admin_client.get("/api/admin/reports/activity/?period=7d")
        assert response_24h.status_code == status.HTTP_200_OK
        assert response_7d.status_code == status.HTTP_200_OK
        assert response_30d.status_code == status.HTTP_200_OK

    def test_moderator_can_access(self, moderator_client, user):
        """Moderator a dashboard.view donc peut accéder."""
        response = moderator_client.get("/api/admin/reports/activity/")
        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_access(self, normal_client):
        """Utilisateur sans rôle admin reçoit 403."""
        response = normal_client.get("/api/admin/reports/activity/")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(ADMIN_REPORTS_ACTIVITY_CACHE_TIMEOUT=30)
    def test_activity_uses_cache_when_enabled(self, admin_client, user):
        """Avec cache activé, le second appel renvoie les mêmes données."""
        cache.clear()
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        r1 = admin_client.get("/api/admin/reports/activity/")
        assert r1.status_code == status.HTTP_200_OK
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGOUT)
        r2 = admin_client.get("/api/admin/reports/activity/")
        assert r2.status_code == status.HTTP_200_OK
        assert r1.data == r2.data

    def test_moderator_cannot_export_activity_csv(self, moderator_client, user):
        """Export réservé admin/superadmin : moderator reçoit 403 sur ?export=csv."""
        response = moderator_client.get("/api/admin/reports/activity/?export=csv")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_export_activity_csv(self, admin_client, user):
        """Admin peut télécharger le journal d'activité en CSV."""
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        response = admin_client.get("/api/admin/reports/activity/?export=csv")
        assert response.status_code == status.HTTP_200_OK
        assert "text/csv" in response.get("Content-Type", "")
        assert "attachment" in response.get("Content-Disposition", "")
        body = response.content.decode("utf-8") if isinstance(response.content, bytes) else str(response.content)
        assert "user" in body and "action" in body

    def test_admin_can_export_activity_pdf(self, admin_client, user):
        """Admin peut télécharger le journal d'activité en PDF."""
        response = admin_client.get("/api/admin/reports/activity/?export=pdf")
        assert response.status_code == status.HTTP_200_OK
        assert "application/pdf" in response.get("Content-Type", "")
        assert "attachment" in response.get("Content-Disposition", "")
        assert response.content[:4] == b"%PDF"

    def test_filter_by_invalid_user_id_ignores_filter(self, admin_client, user):
        """?user=<non-entier> lève ValueError en interne : le filtre user est ignoré (pas de crash)."""
        cache.clear()
        ActivityLog.objects.create(user=user, action=ActivityLog.Action.LOGIN)
        response = admin_client.get("/api/admin/reports/activity/?user=notanumber")
        assert response.status_code == status.HTTP_200_OK
        assert "activity" in response.data
