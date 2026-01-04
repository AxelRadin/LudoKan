from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.serializers import MatchmakingRequestSerializer


@pytest.mark.django_db
def test_serializer_rejects_negative_radius(user, game):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = MatchmakingRequestSerializer(
        data={
            "game": game.id,
            "latitude": 0,
            "longitude": 0,
            "radius_km": 0,
            "expires_at": timezone.now() + timedelta(hours=1),
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "radius_km" in serializer.errors


@pytest.mark.django_db
def test_serializer_rejects_duplicate_active_request(user, game):
    MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=0,
        longitude=0,
        expires_at=timezone.now() + timedelta(hours=1),
    )

    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = MatchmakingRequestSerializer(
        data={
            "game": game.id,
            "latitude": 0,
            "longitude": 0,
            "radius_km": 10,
            "expires_at": timezone.now() + timedelta(hours=1),
        },
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "non_field_errors" in serializer.errors
