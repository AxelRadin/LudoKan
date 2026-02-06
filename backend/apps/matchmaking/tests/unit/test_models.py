"""
Tests pour les modèles et la logique de base de l'app matchmaking.
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from apps.matchmaking.models import Match, MatchmakingRequest
from apps.matchmaking.utils import compute_bbox, haversine, nearby_requests


@pytest.mark.django_db
class TestMatchmakingRequestModel:
    """Tests pour le modèle MatchmakingRequest"""

    def test_create_matchmaking_request(self, user, game):
        expires_at = timezone.now() + timedelta(minutes=10)

        req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=48.8566,
            longitude=2.3522,
            radius_km=10,
            expires_at=expires_at,
        )

        assert req.id is not None
        assert req.user == user
        assert req.game == game
        assert req.status == MatchmakingRequest.STATUS_PENDING
        assert req.expires_at == expires_at

    def test_expiration_flag_and_manager(self, user, game):
        """Vérifie is_expired() et expire_old() du manager."""
        past = timezone.now() - timedelta(minutes=5)
        future = timezone.now() + timedelta(minutes=5)

        expired_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=48.8566,
            longitude=2.3522,
            radius_km=10,
            expires_at=past,
        )
        active_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=48.8566,
            longitude=2.3522,
            radius_km=10,
            expires_at=future,
        )

        assert expired_req.is_expired() is True
        assert active_req.is_expired() is False

        # Expiration "automatique" via le manager
        updated = MatchmakingRequest.objects.expire_old()
        assert updated == 1

        expired_req.refresh_from_db()
        active_req.refresh_from_db()
        assert expired_req.status == MatchmakingRequest.STATUS_EXPIRED
        assert active_req.status == MatchmakingRequest.STATUS_PENDING

    def test_cascade_on_user(self, user, game):
        """La suppression de l'utilisateur doit supprimer la requête."""
        req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=48.8566,
            longitude=2.3522,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        assert MatchmakingRequest.objects.filter(id=req.id).exists() is True

        user.delete()
        assert MatchmakingRequest.objects.filter(id=req.id).exists() is False

    def test_active_manager_filters_only_non_expired(self, user, game):
        past = timezone.now() - timedelta(minutes=5)
        future = timezone.now() + timedelta(minutes=5)

        expired_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            radius_km=10,
            expires_at=past,
        )
        active_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            radius_km=10,
            expires_at=future,
        )

        qs = MatchmakingRequest.objects.active()
        assert expired_req not in qs
        assert active_req in qs


@pytest.mark.django_db
class TestMatchModel:
    """Tests pour le modèle Match"""

    def test_create_match(self, user, admin_user, game):
        match = Match.objects.create(
            player1=user,
            player2=admin_user,
            game=game,
        )

        assert match.id is not None
        assert match.player1 == user
        assert match.player2 == admin_user
        assert match.game == game
        assert match.status == Match.STATUS_ACTIVE
        assert match.created_at is not None

    def test_cascade_delete_user(self, user, admin_user, game):
        match = Match.objects.create(
            player1=user,
            player2=admin_user,
            game=game,
        )

        assert Match.objects.filter(id=match.id).exists() is True
        assert Match.objects.filter(player1=user).exists() is True
        assert Match.objects.count() == 1

        user.delete()
        assert Match.objects.count() == 0


@pytest.mark.django_db
class TestGeolocationUtils:
    """Tests pour la logique de recherche géolocalisée."""

    def test_haversine_zero_distance(self):
        d = haversine(48.8566, 2.3522, 48.8566, 2.3522)
        assert d == 0

    def test_compute_bbox_basic(self):
        bbox = compute_bbox(48.8566, 2.3522, 10)
        # Les bornes doivent entourer le point de départ
        assert bbox.lat_min < 48.8566 < bbox.lat_max
        assert bbox.lon_min < 2.3522 < bbox.lon_max

    def test_nearby_requests_simple(self, user, game):
        center_lat = 48.8566
        center_lon = 2.3522

        # Requête proche (~1 km)
        near_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=center_lat + 0.01,
            longitude=center_lon,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        # Requête lointaine (~1000 km)
        far_req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=40.7128,  # New York
            longitude=-74.0060,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        results = nearby_requests(center_lat, center_lon, radius_km=50, game=game)

        assert near_req in results
        assert far_req not in results

    def test_compute_bbox_near_poles(self):
        bbox = compute_bbox(90, 0, 10)  # très proche du pôle
        # Ici, on vérifie que la longitude a été "ouverte" (delta_lon = 180)
        assert bbox.lon_max - bbox.lon_min == pytest.approx(360.0, rel=1e-3)

    def test_nearby_requests_with_exclude_user(self, user, admin_user, game):
        center_lat, center_lon = 48.8566, 2.3522

        req1 = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=center_lat,
            longitude=center_lon,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        req2 = MatchmakingRequest.objects.create(
            user=admin_user,
            game=game,
            latitude=center_lat,
            longitude=center_lon,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        results = nearby_requests(center_lat, center_lon, radius_km=10, game=game, exclude_user=user)

        assert req1 not in results
        assert req2 in results

    def test_nearby_requests_with_custom_queryset(self, user, game):
        center_lat, center_lon = 48.8566, 2.3522

        req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=center_lat,
            longitude=center_lon,
            radius_km=10,
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        qs = MatchmakingRequest.objects.all()
        results = nearby_requests(center_lat, center_lon, radius_km=10, queryset=qs)

        assert req in results
