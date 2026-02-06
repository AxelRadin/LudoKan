import pytest
from rest_framework.test import APIRequestFactory

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.permissions import IsOwnerOrAdmin


@pytest.mark.django_db
def test_permission_allows_admin_on_foreign_object(admin_user, user, game):
    factory = APIRequestFactory()
    request = factory.patch("/")
    request.user = admin_user

    obj = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at="2099-01-01T00:00:00Z",
    )

    perm = IsOwnerOrAdmin()
    assert perm.has_object_permission(request, None, obj) is True


@pytest.mark.django_db
def test_permission_denies_non_owner_non_admin(user, another_user, game):
    factory = APIRequestFactory()
    request = factory.patch("/")  # méthode non SAFE
    request.user = another_user  # ni owner, ni admin

    obj = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at="2099-01-01T00:00:00Z",
    )

    perm = IsOwnerOrAdmin()
    assert perm.has_object_permission(request, None, obj) is False


@pytest.mark.django_db
def test_permission_allows_safe_method(user, game):
    factory = APIRequestFactory()
    request = factory.get("/")  # SAFE_METHOD
    request.user = user

    obj = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at="2099-01-01T00:00:00Z",
    )

    perm = IsOwnerOrAdmin()
    assert perm.has_object_permission(request, None, obj) is True
