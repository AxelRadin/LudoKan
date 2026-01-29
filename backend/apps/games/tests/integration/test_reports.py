import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Rating
from apps.reviews.models import ContentReport

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
class TestRatingReports:
    def test_authenticated_user_can_report_rating_once(self, auth_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=7,
        )

        url = f"/api/ratings/{rating.id}/report/"
        payload = {"reason": "Contenu inapproprié"}

        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert (
            ContentReport.objects.filter(
                reporter=user,
                target_type=ContentReport.TargetType.RATING,
                target_id=rating.id,
            ).count()
            == 1
        )

    def test_reporting_same_rating_twice_is_idempotent(self, auth_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=5,
        )

        url = f"/api/ratings/{rating.id}/report/"
        payload = {"reason": "Spam"}

        first = auth_client.post(url, payload, format="json")
        second = auth_client.post(url, payload, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_200_OK
        assert (
            ContentReport.objects.filter(
                reporter=user,
                target_type=ContentReport.TargetType.RATING,
                target_id=rating.id,
            ).count()
            == 1
        )

    def test_anonymous_cannot_report_rating(self, api_client, user, game):
        rating = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=6,
        )

        url = f"/api/ratings/{rating.id}/report/"
        response = api_client.post(url, {"reason": "Abus"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reporting_nonexistent_rating_returns_404(self, auth_client):
        url = "/api/ratings/999999/report/"
        response = auth_client.post(url, {"reason": "Abus"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND
