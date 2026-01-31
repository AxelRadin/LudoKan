from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import AdminAction, UserRole
from apps.users.tests.constants import TEST_USER_CREDENTIAL

User = get_user_model()


@pytest.fixture
def admin_client(db):
    user = User.objects.create_user(
        email="admin-resources@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="adminresources",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_client(db):
    user = User.objects.create_user(
        email="mod-resources@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="modresources",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def authenticated_client(db):
    user = User.objects.create_user(
        email="normal-resources@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="normalresources",
    )
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestAdminUserListView:
    def test_admin_can_list_users_with_pagination(self, admin_client):
        # Créer quelques utilisateurs supplémentaires
        User.objects.create_user(
            email="user1@example.com",
            password=TEST_USER_CREDENTIAL,
            pseudo="user1",
        )
        User.objects.create_user(
            email="user2@example.com",
            password=TEST_USER_CREDENTIAL,
            pseudo="user2",
        )

        url = "/api/admin/users/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Réponse paginée standard DRF
        assert "results" in response.data
        assert "count" in response.data
        assert len(response.data["results"]) >= 1

    def test_moderator_can_list_users(self, moderator_client):
        url = "/api/admin/users/"
        response = moderator_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_list_users(self, authenticated_client):
        url = "/api/admin/users/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_user_list_filters(self, admin_client):
        # Créer différents utilisateurs pour tester les filtres
        inactive_mod = User.objects.create_user(
            email="inactive-mod@example.com",
            password=TEST_USER_CREDENTIAL,
            pseudo="inactivemod",
            is_active=False,
        )
        UserRole.objects.create(user=inactive_mod, role=UserRole.Role.MODERATOR)

        staff_admin = User.objects.create_user(
            email="staff-admin@example.com",
            password=TEST_USER_CREDENTIAL,
            pseudo="staffadmin",
            is_staff=True,
        )
        UserRole.objects.create(user=staff_admin, role=UserRole.Role.ADMIN)

        # Filtre par email et pseudo
        resp_email = admin_client.get("/api/admin/users/", {"email": "inactive-mod", "pseudo": "inactive"})
        assert resp_email.status_code == status.HTTP_200_OK

        # Filtre par is_active=false
        resp_inactive = admin_client.get("/api/admin/users/", {"is_active": "false"})
        assert resp_inactive.status_code == status.HTTP_200_OK

        # Filtre par is_staff=true
        resp_staff = admin_client.get("/api/admin/users/", {"is_staff": "true"})
        assert resp_staff.status_code == status.HTTP_200_OK

        # Filtre par rôle
        resp_role = admin_client.get("/api/admin/users/", {"role": UserRole.Role.MODERATOR})
        assert resp_role.status_code == status.HTTP_200_OK

    def test_admin_user_list_date_and_boolean_true_false_filters(self, admin_client):
        """
        Couvre les branches is_active=true, is_staff=false, created_before/after.
        """
        now = timezone.now()
        created_before = (now + timedelta(days=1)).isoformat()
        created_after = (now - timedelta(days=1)).isoformat()

        # L'utilisateur admin_client lui-même est actif et non staff par défaut.
        response = admin_client.get(
            "/api/admin/users/",
            {
                "is_active": "true",
                "is_staff": "false",
                "created_before": created_before,
                "created_after": created_after,
            },
        )
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestAdminActionListView:
    def test_admin_can_list_admin_actions_with_filters(self, admin_client):
        admin_user = admin_client.handler._force_user  # type: ignore[attr-defined]

        action1 = AdminAction.objects.create(
            admin_user=admin_user,
            action_type="user.suspend",
            target_type="user",
            target_id=1,
            description="Suspension test",
        )
        AdminAction.objects.create(
            admin_user=admin_user,
            action_type="review.delete",
            target_type="review",
            target_id=2,
            description="Suppression review",
        )

        url = "/api/admin/actions/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert response.data["count"] >= 2

        # Filtre par action_type
        filtered = admin_client.get(url, {"action_type": "user.suspend"})
        assert filtered.status_code == status.HTTP_200_OK
        assert filtered.data["count"] >= 1
        ids = {item["id"] for item in filtered.data["results"]}
        assert action1.id in ids

    def test_moderator_can_list_admin_actions(self, moderator_client):
        url = "/api/admin/actions/"
        response = moderator_client.get(url)

        assert response.status_code == status.HTTP_200_OK

    def test_non_admin_cannot_list_admin_actions(self, authenticated_client):
        url = "/api/admin/actions/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_action_list_additional_filters(self, admin_client):
        admin_user = admin_client.handler._force_user  # type: ignore[attr-defined]

        a1 = AdminAction.objects.create(
            admin_user=admin_user,
            action_type="review.delete",
            target_type="review",
            target_id=10,
            description="Delete review 10",
        )
        AdminAction.objects.create(
            admin_user=None,
            action_type="user.suspend",
            target_type="user",
            target_id=20,
            description="Suspend user 20",
        )

        base_url = "/api/admin/actions/"

        # Filtre par target_type
        resp_type = admin_client.get(base_url, {"target_type": "review"})
        assert resp_type.status_code == status.HTTP_200_OK

        # Filtre par target_id
        resp_target = admin_client.get(base_url, {"target_id": a1.target_id})
        assert resp_target.status_code == status.HTTP_200_OK

        # Filtre par admin_user_id
        resp_admin = admin_client.get(base_url, {"admin_user_id": admin_user.id})
        assert resp_admin.status_code == status.HTTP_200_OK

    def test_admin_action_list_before_after_filters(self, admin_client):
        """
        Couvre les filtres before/after (timestamp) dans AdminActionListView.
        """
        admin_user = admin_client.handler._force_user  # type: ignore[attr-defined]

        AdminAction.objects.create(
            admin_user=admin_user,
            action_type="user.suspend",
            target_type="user",
            target_id=99,
            description="Suspension with timestamp",
        )

        now = timezone.now()
        before = (now + timedelta(minutes=1)).isoformat()
        after = (now - timedelta(minutes=1)).isoformat()

        response = admin_client.get(
            "/api/admin/actions/",
            {"before": before, "after": after},
        )
        assert response.status_code == status.HTTP_200_OK
