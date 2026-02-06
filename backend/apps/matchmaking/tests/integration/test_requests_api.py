from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.matchmaking.models import MatchmakingRequest


@pytest.mark.django_db
class TestMatchmakingRequestsAPI:
    def test_create_valid_request(self, authenticated_api_client, game):
        payload = {
            "game": game.id,
            "latitude": 48.85,
            "longitude": 2.35,
            "radius_km": 10,
            "expires_at": (timezone.now() + timedelta(hours=1)).isoformat(),
        }

        response = authenticated_api_client.post(
            "/api/matchmaking/requests/",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_create_with_past_expiration_fails(self, authenticated_api_client, game):
        payload = {
            "game": game.id,
            "latitude": 48.85,
            "longitude": 2.35,
            "radius_km": 10,
            "expires_at": (timezone.now() - timedelta(hours=1)).isoformat(),
        }

        response = authenticated_api_client.post(
            "/api/matchmaking/requests/",
            payload,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_only_active_requests(self, authenticated_api_client, user, game):
        MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = authenticated_api_client.get("/api/matchmaking/requests/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_list_filtered_by_game(self, authenticated_api_client, user, game, publisher):
        from apps.games.models import Game

        other_game = Game.objects.create(
            igdb_id=999,
            name="Other Game",
            publisher=publisher,
        )

        MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        MatchmakingRequest.objects.create(
            user=user,
            game=other_game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = authenticated_api_client.get(f"/api/matchmaking/requests/?game={game.id}")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_update_by_other_user_forbidden(
        self,
        authenticated_api_client,
        another_user,
        game,
    ):
        req = MatchmakingRequest.objects.create(
            user=another_user,
            game=game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = authenticated_api_client.patch(
            f"/api/matchmaking/requests/{req.id}/",
            {"radius_km": 20},
            format="json",
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_expired_request_fails(self, authenticated_api_client, user, game):
        req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = authenticated_api_client.patch(
            f"/api/matchmaking/requests/{req.id}/",
            {"radius_km": 20},
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

        req.refresh_from_db()
        assert req.status == MatchmakingRequest.STATUS_EXPIRED

    def test_update_own_request_success(self, authenticated_api_client, user, game):
        req = MatchmakingRequest.objects.create(
            user=user,
            game=game,
            latitude=0,
            longitude=0,
            expires_at=timezone.now() + timedelta(hours=1),
        )

        response = authenticated_api_client.patch(
            f"/api/matchmaking/requests/{req.id}/",
            {"radius_km": 25},
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK

        req.refresh_from_db()
        assert req.radius_km == 25
