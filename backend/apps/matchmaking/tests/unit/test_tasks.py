from datetime import timedelta

import pytest
from django.utils import timezone

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.tasks import expire_old_matchmaking_requests


@pytest.mark.django_db
def test_expired_request_is_updated(user, game):
    req = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at=timezone.now() - timedelta(hours=1),
        status=MatchmakingRequest.STATUS_PENDING,
    )

    count = expire_old_matchmaking_requests()

    req.refresh_from_db()
    assert count == 1
    assert req.status == MatchmakingRequest.STATUS_EXPIRED


@pytest.mark.django_db
def test_valid_request_is_not_modified(user, game):
    req = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at=timezone.now() + timedelta(hours=1),
        status=MatchmakingRequest.STATUS_PENDING,
    )

    count = expire_old_matchmaking_requests()

    req.refresh_from_db()
    assert count == 0
    assert req.status == MatchmakingRequest.STATUS_PENDING


@pytest.mark.django_db
def test_multiple_expired_requests(user, game):
    MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at=timezone.now() - timedelta(hours=2),
    )
    MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=1,
        longitude=1,
        expires_at=timezone.now() - timedelta(minutes=10),
    )

    count = expire_old_matchmaking_requests()

    assert count == 2
    assert MatchmakingRequest.objects.filter(status=MatchmakingRequest.STATUS_EXPIRED).count() == 2


@pytest.mark.django_db
def test_no_expired_requests_returns_zero(user, game):
    MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at=timezone.now() + timedelta(hours=2),
    )

    count = expire_old_matchmaking_requests()
    assert count == 0
