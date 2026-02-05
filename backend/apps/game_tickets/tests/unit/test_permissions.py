from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model

from apps.game_tickets.permissions import IsStaff

User = get_user_model()


@pytest.mark.django_db
def test_is_staff_permission_grants_for_staff_user():
    user = User.objects.create_user(
        email="staff-perm@example.com",
        password="TestPass123!",
        is_staff=True,
    )

    request = SimpleNamespace(user=user)
    perm = IsStaff()

    assert perm.has_permission(request, view=None) is True


@pytest.mark.django_db
def test_is_staff_permission_denies_for_non_staff_user():
    user = User.objects.create_user(
        email="nonstaff-perm@example.com",
        password="TestPass123!",
        is_staff=False,
    )

    request = SimpleNamespace(user=user)
    perm = IsStaff()

    assert perm.has_permission(request, view=None) is False
