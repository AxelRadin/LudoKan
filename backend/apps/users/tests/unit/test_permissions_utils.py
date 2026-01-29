"""
Tests pour les utilitaires de permissions et de rôles/suspensions de l'app users.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

from apps.users.models import UserRole, UserSuspension
from apps.users.permissions import HasPermission, IsAdminWithPermission, IsNotSuspended, _collect_role_permissions, has_permission, is_user_suspended

User = get_user_model()


@pytest.mark.django_db
class TestHasPermissionHelper:
    """Tests unitaires pour la fonction has_permission(user, permission)."""

    def test_anonymous_user_has_no_permission(self, rf):
        """Un utilisateur anonyme ne doit jamais avoir de permission métier."""

        user = AnonymousUser()

        assert has_permission(user, "user.view") is False
        assert has_permission(user, "user.suspend") is False

    def test_superuser_has_all_permissions(self):
        """Un superutilisateur Django doit avoir toutes les permissions."""

        user = User.objects.create_superuser(
            email="super@example.com",
            pseudo="super",
            password="superpass123",
        )

        assert has_permission(user, "user.view") is True
        assert has_permission(user, "user.suspend") is True
        assert has_permission(user, "nimporte.quoi") is True

    def test_moderator_permissions(self, user):
        """Un moderator a uniquement les permissions de lecture admin (reviews/ratings)."""

        UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

        assert has_permission(user, "review_read") is True
        assert has_permission(user, "rating_read") is True
        assert has_permission(user, "user.suspend") is False

    def test_admin_permissions(self, user):
        """Un admin a les permissions admin définies dans ROLE_PERMISSIONS."""

        UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

        assert has_permission(user, "user.view") is True
        assert has_permission(user, "user.suspend") is True
        assert has_permission(user, "user.edit") is True
        # Permission non déclarée
        assert has_permission(user, "nimporte.quoi") is False

    def test_superadmin_wildcard_permissions(self, user):
        """Un superadmin hérite de toutes les permissions grâce au joker '*'."""

        UserRole.objects.create(user=user, role=UserRole.Role.SUPERADMIN)

        assert has_permission(user, "user.view") is True
        assert has_permission(user, "user.suspend") is True
        assert has_permission(user, "review.moderate") is True
        # Même une permission non déclarée doit passer
        assert has_permission(user, "nimporte.quoi") is True

    def test_collect_role_permissions_helper(self, user):
        """_collect_role_permissions doit faire l'union des permissions de tous les rôles."""

        admin_role = UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
        mod_role = UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

        perms = _collect_role_permissions([admin_role, mod_role])

        # Permissions communes
        assert "user.view" in perms
        # Permissions spécifiques admin
        assert "user.suspend" in perms
        # Permissions spécifiques modérateur
        assert "review_read" in perms

    def test_suspended_user_has_no_permissions_even_with_roles(self, user):
        """Un utilisateur suspendu ne doit plus avoir de permissions métier."""

        UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
        UserSuspension.objects.create(
            user=user,
            reason="Test ban",
            is_active=True,
        )

        assert has_permission(user, "user.suspend") is False
        assert has_permission(user, "user.view") is False


@pytest.mark.django_db
class TestIsUserSuspendedHelper:
    """Tests unitaires pour la fonction is_user_suspended(user)."""

    def test_user_without_suspension_is_not_suspended(self, user):
        assert is_user_suspended(user) is False

    def test_anonymous_user_is_never_suspended(self):
        """Un AnonymousUser ne doit jamais être considéré comme suspendu."""
        anon = AnonymousUser()
        assert is_user_suspended(anon) is False

    def test_user_with_active_indefinite_suspension_is_suspended(self, user):
        UserSuspension.objects.create(
            user=user,
            reason="Indefinite ban",
            is_active=True,
            end_date=None,
        )

        assert is_user_suspended(user) is True

    def test_user_with_expired_suspension_is_not_suspended(self, user):
        past = timezone.now() - timedelta(days=1)
        UserSuspension.objects.create(
            user=user,
            reason="Temp ban",
            is_active=True,
            end_date=past,
        )

        assert is_user_suspended(user) is False


@pytest.mark.django_db
class TestDRFPermissions:
    """Tests d'intégration légère pour les classes de permissions DRF."""

    class DummyView:
        """Vue factice pour simuler required_permission."""

        required_permission = None

    class DummyRequest:
        """Request minimale avec seulement un attribut user."""

        def __init__(self, user):
            self.user = user

    def test_has_permission_requires_auth_when_no_permission_specified(self, user):
        """Sans required_permission, HasPermission exige juste un user authentifié."""

        perm = HasPermission()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is True

    def test_has_permission_denies_anonymous_when_no_permission_specified(self, rf):
        request = rf.get("/")
        # Simuler le comportement de DRF qui attache toujours un user
        request.user = AnonymousUser()
        perm = HasPermission()
        view = self.DummyView()

        assert perm.has_permission(request, view) is False

    def test_has_permission_with_required_permission_attribute_on_view(self, user):
        """Le nom de permission peut venir de view.required_permission."""

        UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

        perm = HasPermission()

        class ViewWithPermission(self.DummyView):
            required_permission = "user.suspend"

        view = ViewWithPermission()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is True

    def test_has_permission_with_required_permission_on_subclass(self, user):
        """Le nom de permission peut être défini sur une sous-classe de HasPermission."""

        UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)

        class CanModerateReviews(HasPermission):
            required_permission = "review_read"

        perm = CanModerateReviews()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is True

    def test_is_admin_with_permission_rejects_user_without_role(self, user):
        """IsAdminWithPermission doit refuser un user sans rôle admin/modérateur."""

        class CanReadAdminStuff(IsAdminWithPermission):
            required_permission = "review_read"

        perm = CanReadAdminStuff()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is False

    def test_is_admin_with_permission_allows_admin_with_permission(self, user):
        """IsAdminWithPermission doit autoriser un admin avec la permission requise."""

        UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)

        class CanReadAdminStuff(IsAdminWithPermission):
            required_permission = "review_read"

        perm = CanReadAdminStuff()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is True

    def test_is_admin_with_permission_rejects_anonymous_user(self, rf):
        """IsAdminWithPermission doit refuser un utilisateur anonyme (non authentifié)."""

        class CanReadAdminStuff(IsAdminWithPermission):
            required_permission = "review_read"

        request = rf.get("/")
        request.user = AnonymousUser()

        perm = CanReadAdminStuff()
        view = self.DummyView()

        assert perm.has_permission(request, view) is False

    def test_is_admin_with_permission_allows_django_superuser(self):
        """IsAdminWithPermission doit autoriser un superuser Django via le raccourci super()."""

        superuser = User.objects.create_superuser(
            email="superadmin-perm@example.com",
            pseudo="superadmin-perm",
            password="SuperAdminPass123!",
        )

        class CanReadAdminStuff(IsAdminWithPermission):
            required_permission = "review_read"

        perm = CanReadAdminStuff()
        view = self.DummyView()
        request = self.DummyRequest(superuser)

        assert perm.has_permission(request, view) is True

    def test_is_not_suspended_denies_suspended_user(self, user):
        """IsNotSuspended doit bloquer un utilisateur avec une suspension active."""

        UserSuspension.objects.create(
            user=user,
            reason="Ban",
            is_active=True,
        )

        perm = IsNotSuspended()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is False

    def test_is_not_suspended_allows_non_suspended_user(self, user):
        perm = IsNotSuspended()
        view = self.DummyView()
        request = self.DummyRequest(user)

        assert perm.has_permission(request, view) is True

    def test_is_not_suspended_denies_anonymous(self, rf):
        """IsNotSuspended doit refuser un utilisateur anonyme."""

        request = rf.get("/")
        request.user = AnonymousUser()

        perm = IsNotSuspended()
        view = self.DummyView()

        assert perm.has_permission(request, view) is False
