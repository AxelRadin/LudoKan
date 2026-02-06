from datetime import timedelta

import pytest
from django.utils import timezone

from apps.matchmaking.models import MatchmakingRequest
from apps.matchmaking.utils import find_matches, haversine, nearby_requests


@pytest.mark.django_db
def test_haversine_distance():
    paris = (48.8566, 2.3522)
    london = (51.5074, -0.1278)
    distance = haversine(*paris, *london)
    # environ 343 km
    assert 340 < distance < 350


@pytest.mark.django_db
def test_nearby_requests_respects_radius(user, game, another_user):
    # Création de requêtes proches et lointaines
    req1 = MatchmakingRequest.objects.create(
        user=another_user,
        game=game,
        latitude=48.8566,  # Paris
        longitude=2.3522,
        radius_km=5,
        expires_at=timezone.now() + timedelta(hours=1),
    )

    req2 = MatchmakingRequest.objects.create(
        user=another_user,
        game=game,
        latitude=51.5074,  # Londres
        longitude=-0.1278,
        radius_km=5,
        expires_at=timezone.now() + timedelta(hours=1),
    )

    # Recherche depuis Paris, radius 10km
    results = nearby_requests(
        lat=48.8566,
        lon=2.3522,
        radius_km=10,
        exclude_user=None,
    )

    # Seule la requête proche est incluse
    assert req1 in results
    assert req2 not in results


@pytest.mark.django_db
def test_find_matches_with_expired_request(user, game):
    # Création d'une requête expirée
    expired_req = MatchmakingRequest.objects.create(
        user=user,
        game=game,
        latitude=48.8566,
        longitude=2.3522,
        radius_km=10,
        expires_at=timezone.now() - timedelta(minutes=1),  # déjà expirée
        status=MatchmakingRequest.STATUS_PENDING,
    )

    # find_matches doit retourner une liste vide
    results = find_matches(expired_req)
    assert results == []
