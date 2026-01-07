from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.matchmaking.models import MatchmakingRequest


@pytest.mark.django_db
class TestMatchmakingMatchesAPI:
    def test_no_active_request_returns_404(self, authenticated_api_client):
        response = authenticated_api_client.get("/api/matchmaking/matches/")
        assert response.status_code == 404
        assert "Aucune demande" in response.data["detail"]

    def test_matches_sorted_by_distance(self, authenticated_api_client, user, another_user, game):
        # Demande active de l'utilisateur principal
        MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=48.8566,  # Paris
            longitude=2.3522,
            radius_km=1000,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        # Deux autres utilisateurs
        MatchmakingRequest.objects.create(
            user=another_user,
            game=game,
            latitude=48.8584,  # Paris proche
            longitude=2.2945,
            radius_km=1000,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        User = get_user_model()
        other_user2 = User.objects.create_user(
            email="other2@test.com",
            password="pass",
        )

        MatchmakingRequest.objects.create(
            user=other_user2,
            game=game,
            latitude=51.5074,  # Londres
            longitude=-0.1278,
            radius_km=1000,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = authenticated_api_client.get("/api/matchmaking/matches/")
        assert response.status_code == 200

        data = response.data
        assert len(data) == 2

        assert data[0]["distance_km"] <= data[1]["distance_km"]
