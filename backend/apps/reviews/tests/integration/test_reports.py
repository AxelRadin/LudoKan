import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.reviews.models import ContentReport, Review
from apps.users.models import UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def admin_user(db):
    """Utilisateur admin pour les endpoints de reports."""
    user = User.objects.create_user(
        email="adminreports@example.com",
        password="AdminPass123!",
        pseudo="adminreports",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    return user


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.mark.django_db
class TestReviewReports:
    def test_authenticated_user_can_report_review_once(self, auth_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Great game")

        url = f"/api/reviews/{review.id}/report/"
        payload = {"reason": "Contenu inapproprié"}

        response = auth_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        report = ContentReport.objects.get(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
        )
        assert str(report) == f"Report by {user.id} on {ContentReport.TargetType.REVIEW}#{review.id}"

    def test_reporting_same_review_twice_is_idempotent(self, auth_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Spammy review")

        url = f"/api/reviews/{review.id}/report/"
        payload = {"reason": "Spam"}

        first = auth_client.post(url, payload, format="json")
        second = auth_client.post(url, payload, format="json")

        assert first.status_code == status.HTTP_201_CREATED
        assert second.status_code == status.HTTP_200_OK
        assert (
            ContentReport.objects.filter(
                reporter=user,
                target_type=ContentReport.TargetType.REVIEW,
                target_id=review.id,
            ).count()
            == 1
        )

    def test_anonymous_cannot_report_review(self, api_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Review to report")

        url = f"/api/reviews/{review.id}/report/"
        response = api_client.post(url, {"reason": "Abus"}, format="json")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_reporting_nonexistent_review_returns_404(self, auth_client):
        url = "/api/reviews/999999/report/"
        response = auth_client.post(url, {"reason": "Abus"}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestAdminReports:
    def test_admin_can_list_reports_with_filters(self, admin_client, user, user2, game):
        # Contenu suffisamment long pour passer la validation (min 4 chars)
        review1 = Review.objects.create(user=user, game=game, content="Review 1")
        review2 = Review.objects.create(user=user2, game=game, content="Review 2")

        r1 = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review1.id,
            reason="Spam 1",
            handled=False,
        )
        r2 = ContentReport.objects.create(
            reporter=user2,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review2.id,
            reason="Spam 2",
            handled=True,
        )

        assert r1.reason == "Spam 1"
        assert r2.reason == "Spam 2"

        url = "/api/admin/reports/"

        # Liste complète (handled=None)
        resp_all = admin_client.get(url)
        assert resp_all.status_code == status.HTTP_200_OK
        assert len(resp_all.data) == 2

        # Filtre par type de cible
        resp_type = admin_client.get(url, {"target_type": ContentReport.TargetType.REVIEW})
        assert resp_type.status_code == status.HTTP_200_OK
        assert len(resp_type.data) == 2

        # Filtre par target_id
        resp_target = admin_client.get(url, {"target_id": review1.id})
        assert resp_target.status_code == status.HTTP_200_OK
        assert len(resp_target.data) == 1
        assert resp_target.data[0]["target_id"] == review1.id

        # Filtre par reporter
        resp_reporter = admin_client.get(url, {"reporter": user.id})
        assert resp_reporter.status_code == status.HTTP_200_OK
        assert len(resp_reporter.data) == 1
        assert resp_reporter.data[0]["reporter"]["id"] == user.id

        # Filtre par handled=true
        resp_handled_true = admin_client.get(url, {"handled": "true"})
        assert resp_handled_true.status_code == status.HTTP_200_OK
        assert all(item["handled"] is True for item in resp_handled_true.data)

        # Filtre par handled=false
        resp_handled_false = admin_client.get(url, {"handled": "false"})
        assert resp_handled_false.status_code == status.HTTP_200_OK
        assert all(item["handled"] is False for item in resp_handled_false.data)

    def test_admin_can_mark_report_handled_and_unhandled(self, admin_client, admin_user, user, game):
        review = Review.objects.create(user=user, game=game, content="Reportable review")
        report = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="Test handle",
        )

        url = f"/api/admin/reports/{report.id}/"

        resp_true = admin_client.patch(url, data={"handled": True}, format="json")
        assert resp_true.status_code == status.HTTP_200_OK
        report.refresh_from_db()
        assert report.handled is True
        assert report.handled_by_id == admin_user.id
        assert report.handled_at is not None

        # Revenir à non traité (handled=False) pour couvrir la branche else
        resp_false = admin_client.patch(url, data={"handled": False}, format="json")
        assert resp_false.status_code == status.HTTP_200_OK
        report.refresh_from_db()
        assert report.handled is False
        assert report.handled_by is None
        assert report.handled_at is None
