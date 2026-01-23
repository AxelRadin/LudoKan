"""
Tests pour les modèles de l'app users
"""
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from apps.users.models import AdminAction, UserRole, UserSuspension

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests pour le modèle User (CustomUser)"""

    def test_create_user(self):
        """Test de création d'un utilisateur normal"""
        user = User.objects.create_user(
            email="test@example.com",
            pseudo="testuser",
            password="testpass123",
        )

        assert user.pseudo == "testuser"
        assert user.email == "test@example.com"
        assert user.check_password("testpass123")
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False

    def test_create_superuser(self):
        """Test de création d'un superutilisateur"""
        user = User.objects.create_superuser(
            email="admin@example.com",
            pseudo="admin",
            password="adminpass123",
        )

        assert user.is_staff is True
        assert user.is_superuser is True

    def test_user_str_representation(self):
        """Test de la représentation string de l'utilisateur"""
        user = User.objects.create_user(
            email="test@example.com",
            pseudo="testuser",
            password="testpass123",
        )

        # __str__ renvoie le pseudo
        assert str(user) == "testuser"

    def test_user_email_unique(self):
        """Test que l'email doit être unique"""
        User.objects.create_user(
            email="test@example.com",
            pseudo="user1",
            password="testpass123",
        )

        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="test@example.com",
                pseudo="user2",
                password="testpass123",
            )

    def test_user_pseudo_unique(self):
        """Test que le pseudo doit être unique"""
        User.objects.create_user(
            email="test1@example.com",
            pseudo="testuser",
            password="testpass123",
        )

        with pytest.raises(IntegrityError):
            User.objects.create_user(
                email="test2@example.com",
                pseudo="testuser",
                password="testpass123",
            )

    def test_create_user_without_email_raises_value_error(self):
        """L'email est obligatoire pour créer un utilisateur."""
        with pytest.raises(ValueError):
            User.objects.create_user(
                email="",
                pseudo="noemail",
                password="testpass123",
            )

    def test_auto_generated_pseudo_is_unique(self):
        """Le manager doit générer un pseudo unique basé sur l'email."""
        user1 = User.objects.create_user(
            email="auto@example.com",
            password="testpass123",
        )
        user2 = User.objects.create_user(
            email="auto@another.com",  # même local-part -> slug identique
            password="testpass123",
        )

        assert user1.pseudo != user2.pseudo


@pytest.mark.django_db
class TestUserRoleModel:
    """Tests pour le modèle UserRole."""

    def test_user_role_str_representation(self, user):
        role = UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

        assert str(role) == f"{user.pseudo} - Admin"

    def test_user_role_unique_per_user_and_role(self, user):
        UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

        with pytest.raises(IntegrityError):
            UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)


@pytest.mark.django_db
class TestUserSuspensionModel:
    """Tests pour le modèle UserSuspension."""

    def test_user_suspension_str_without_end_date(self, user):
        suspension = UserSuspension.objects.create(
            user=user,
            reason="Test",
        )

        assert str(suspension) == f"Suspension de {user.pseudo}"

    def test_user_suspension_str_with_end_date(self, user):
        end = timezone.now() + timedelta(days=1)
        suspension = UserSuspension.objects.create(
            user=user,
            reason="Test",
            end_date=end,
        )

        # Le __str__ doit inclure la date de fin
        assert "jusqu'au" in str(suspension)

    def test_is_expired_true_when_inactive(self, user):
        suspension = UserSuspension.objects.create(
            user=user,
            reason="Test",
            is_active=False,
        )

        assert suspension.is_expired is True

    def test_is_expired_false_when_no_end_date_and_active(self, user):
        suspension = UserSuspension.objects.create(
            user=user,
            reason="Test",
            is_active=True,
            end_date=None,
        )

        assert suspension.is_expired is False

    def test_is_expired_depends_on_end_date(self, user):
        past = timezone.now() - timedelta(days=1)
        future = timezone.now() + timedelta(days=1)

        expired = UserSuspension.objects.create(
            user=user,
            reason="Past",
            end_date=past,
        )
        active = UserSuspension.objects.create(
            user=user,
            reason="Future",
            end_date=future,
        )

        assert expired.is_expired is True
        assert active.is_expired is False


@pytest.mark.django_db
class TestAdminActionModel:
    """Tests pour le modèle AdminAction."""

    def test_admin_action_str_representation(self, user):
        action = AdminAction.objects.create(
            admin_user=user,
            action_type="user.suspend",
            target_type="user",
            target_id=123,
            description="Suspension pour test",
        )

        assert "user.suspend par" in str(action)
