import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

import apps.reviews.views as review_views
from apps.games.models import Game, Rating
from apps.reviews.models import ContentReport, Review
from apps.reviews.views import (
    AdminReportDetailView,
    AdminReportListView,
    AdminReviewDetailView,
    AdminReviewListView,
    IsOwnerOrReadOnly,
    _parse_list_page,
    _parse_rating_value_filter,
)

User = get_user_model()


@pytest.fixture
def another_user(user2):
    return user2


@pytest.fixture
def allow_admin_review_permissions(monkeypatch):
    monkeypatch.setattr(
        review_views.CanReadReview,
        "has_permission",
        lambda self, request, view: True,
    )
    monkeypatch.setattr(
        review_views.CanEditReview,
        "has_permission",
        lambda self, request, view: True,
    )
    monkeypatch.setattr(
        review_views.CanDeleteReview,
        "has_permission",
        lambda self, request, view: True,
    )
    monkeypatch.setattr(
        review_views.CanReadReport,
        "has_permission",
        lambda self, request, view: True,
    )
    monkeypatch.setattr(
        review_views.CanEditReport,
        "has_permission",
        lambda self, request, view: True,
    )


@pytest.mark.parametrize(
    "raw, expected",
    [
        (None, None),
        ("1", 1),
        ("5", 5),
        ("0", None),
        ("6", None),
        ("abc", None),
    ],
)
def test_parse_rating_value_filter(raw, expected):
    assert _parse_rating_value_filter(raw) == expected


@pytest.mark.parametrize(
    "raw, expected",
    [
        (None, 1),
        ("", 1),
        ("1", 1),
        ("3", 3),
        ("0", 1),
        ("-4", 1),
        ("oops", 1),
    ],
)
def test_parse_list_page(raw, expected):
    assert _parse_list_page(raw) == expected


@pytest.mark.django_db
class TestReviewViewSet:
    def test_list_reviews_filters_by_game_and_user(self, user, game, another_user):
        Review.objects.create(user=user, game=game, content="Review 1")
        Review.objects.create(user=another_user, game=game, content="Review 2")

        client = APIClient()
        url = "/api/reviews/"

        # Filtre par game
        response = client.get(url, {"game": game.id})
        assert response.status_code == 200
        assert response.data["count"] == 2
        assert len(response.data["results"]) == 2

        # Filtre par user
        response = client.get(url, {"user": user.id})
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["user"]["id"] == user.id

    def test_list_reviews_filters_by_rating_value(self, user, another_user, game):
        r4 = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=4,
        )
        Review.objects.create(user=user, game=game, content="Quatre étoiles", rating=r4)
        Rating.objects.create(
            user=another_user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=4,
        )

        client = APIClient()
        url = "/api/reviews/"
        response = client.get(url, {"game": game.id, "rating_value": 4})
        assert response.status_code == 200
        assert response.data["count"] == 2
        assert len(response.data["results"]) == 2
        assert any(row.get("content") == "Quatre étoiles" for row in response.data["results"])
        assert any(row.get("rating_only") for row in response.data["results"])

        response_all = client.get(url, {"game": game.id})
        assert response_all.data["count"] == 2

    def test_list_with_game_and_user_uses_get_queryset_game_filter(self, user, another_user, game):
        """?game=&user= force super().list() : le filtre game_id dans get_queryset doit s'appliquer."""
        Review.objects.create(user=user, game=game, content="Pour ce jeu")
        other_game_review = Review.objects.create(
            user=user,
            game=Game.objects.create(
                igdb_id=9001,
                name="Autre jeu",
                description="",
                publisher=game.publisher,
            ),
            content="Autre jeu",
        )
        Review.objects.create(user=another_user, game=game, content="Autre user même jeu")

        client = APIClient()
        response = client.get("/api/reviews/", {"game": str(game.id), "user": str(user.id)})
        assert response.status_code == 200
        ids = {row["id"] for row in response.data["results"]}
        assert other_game_review.id not in ids
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["content"] == "Pour ce jeu"

    def test_list_with_game_and_user_rating_value_invalid_skips_rating_filter(self, user, game, another_user):
        r3 = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=3,
        )
        Review.objects.create(user=user, game=game, content="Trois", rating=r3)
        Review.objects.create(user=another_user, game=game, content="Sans note")

        client = APIClient()
        for bad in ("not-a-number", "99"):
            resp = client.get(
                "/api/reviews/",
                {"game": str(game.id), "user": str(user.id), "rating_value": bad},
            )
            assert resp.status_code == 200
            assert resp.data["count"] == 1

    def test_list_with_game_and_user_filters_by_valid_rating_value(self, user, game, another_user):
        r3 = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=3,
        )
        Review.objects.create(user=user, game=game, content="Trois étoiles", rating=r3)
        r5 = Rating.objects.create(
            user=another_user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )
        Review.objects.create(user=another_user, game=game, content="Cinq", rating=r5)

        client = APIClient()
        resp = client.get(
            "/api/reviews/",
            {"game": str(game.id), "user": str(user.id), "rating_value": "3"},
        )
        assert resp.status_code == 200
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["content"] == "Trois étoiles"

    def test_list_user_only_invalid_rating_value_get_queryset(self, user, game, another_user):
        """Liste classique (?user= sans ?game=) : parsing rating_value dans get_queryset."""
        r4 = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=4,
        )
        Review.objects.create(user=user, game=game, content="Ici", rating=r4)
        Review.objects.create(user=another_user, game=game, content="Là")

        client = APIClient()
        resp = client.get("/api/reviews/", {"user": str(user.id), "rating_value": "bad"})
        assert resp.status_code == 200
        assert resp.data["count"] == 1

    def test_list_user_only_filters_by_rating_value_get_queryset(self, user, game):
        g2 = Game.objects.create(
            igdb_id=9002,
            name="Jeu 2",
            description="",
            publisher=game.publisher,
        )
        r3 = Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=3,
        )
        r5 = Rating.objects.create(
            user=user,
            game=g2,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )
        Review.objects.create(user=user, game=game, content="Sur jeu 1", rating=r3)
        Review.objects.create(user=user, game=g2, content="Sur jeu 2", rating=r5)

        client = APIClient()
        resp = client.get("/api/reviews/", {"user": str(user.id), "rating_value": "5"})
        assert resp.status_code == 200
        assert resp.data["count"] == 1
        assert resp.data["results"][0]["content"] == "Sur jeu 2"

    def test_merged_list_invalid_game_id_falls_back_to_default_list(self, game):
        client = APIClient()
        response = client.get("/api/reviews/", {"game": "not-an-int"})
        assert response.status_code == 200
        assert "results" in response.data

    def test_list_invalid_user_query_param_skips_user_filter(self, user, game):
        Review.objects.create(user=user, game=game, content="Visible")
        client = APIClient()
        resp = client.get("/api/reviews/", {"user": "not-an-int"})
        assert resp.status_code == 200
        assert resp.data["count"] >= 1

    def test_merged_list_invalid_rating_value_ignored(self, user, game):
        Rating.objects.create(
            user=user,
            game=game,
            rating_type=Rating.RATING_TYPE_ETOILES,
            value=5,
        )
        Review.objects.create(user=user, game=game, content="Avis")
        client = APIClient()
        for bad in ("x", "0"):
            resp = client.get("/api/reviews/", {"game": str(game.id), "rating_value": bad})
            assert resp.status_code == 200
            assert resp.data["count"] >= 1

    def test_merged_list_invalid_page_defaults_to_first_page(self, user, game):
        Review.objects.create(user=user, game=game, content="Seul")
        client = APIClient()
        resp = client.get("/api/reviews/", {"game": str(game.id), "page": "oops"})
        assert resp.status_code == 200
        assert len(resp.data["results"]) == 1

    def test_merged_list_next_includes_rating_value_query_param(self, game):
        """Plus de PAGE_SIZE entrées : next appelle page_url avec rating_value."""
        client = APIClient()
        for i in range(11):
            u = User.objects.create_user(
                email=f"pag{i}@example.com",
                password="TestPass123!",
                pseudo=f"paguser{i}",
            )
            rt = Rating.objects.create(
                user=u,
                game=game,
                rating_type=Rating.RATING_TYPE_ETOILES,
                value=4,
            )
            Review.objects.create(user=u, game=game, content=f"R{i}", rating=rt)

        resp = client.get("/api/reviews/", {"game": str(game.id), "rating_value": "4"})
        assert resp.status_code == 200
        assert resp.data["count"] == 11
        assert resp.data["next"] is not None
        assert "rating_value=4" in resp.data["next"]

    def test_merged_list_previous_url_on_second_page(self, game):
        client = APIClient()

        for i in range(11):
            u = User.objects.create_user(
                email=f"prev{i}@example.com",
                password="TestPass123!",
                pseudo=f"prevuser{i}",
            )
            Review.objects.create(user=u, game=game, content=f"Review {i}")

        response = client.get("/api/reviews/", {"game": str(game.id), "page": "2"})

        assert response.status_code == 200
        assert response.data["previous"] is not None
        assert "page=1" in response.data["previous"]

    def test_create_review_associates_authenticated_user(self, user, game):
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            "/api/reviews/",
            {"game": game.id, "content": "Nice game!", "rating_value": 4},
            format="json",
        )

        assert response.status_code == 201
        review = Review.objects.get(id=response.data["id"])
        assert review.user == user

    def test_get_permissions_owner_only_for_update_and_delete(self, user, another_user, game):
        client = APIClient()
        review = Review.objects.create(user=user, game=game, content="Owned review")

        # Un autre utilisateur ne peut pas modifier
        client.force_authenticate(user=another_user)
        url = f"/api/reviews/{review.id}/"
        response = client.patch(url, {"content": "Updated"}, format="json")
        assert response.status_code in (403, 404)

        # Propriétaire peut modifier
        client.force_authenticate(user=user)
        response = client.patch(url, {"content": "Updated"}, format="json")
        assert response.status_code == 200


def test_is_owner_or_read_only_allows_safe_methods_for_any_user(rf):
    """La permission doit renvoyer True pour les SAFE_METHODS, même si l'utilisateur n'est pas le propriétaire."""
    perm = IsOwnerOrReadOnly()
    request = rf.get("/api/reviews/1/")

    class Obj:
        user = object()

    assert perm.has_object_permission(request, view=None, obj=Obj())


def test_is_owner_or_read_only_denies_unsafe_method_for_non_owner(rf, user, another_user):
    perm = IsOwnerOrReadOnly()
    request = rf.patch("/api/reviews/1/")
    request.user = another_user

    class Obj:
        pass

    obj = Obj()
    obj.user = user

    assert perm.has_object_permission(request, view=None, obj=obj) is False


@pytest.mark.django_db
class TestAdminReviewViews:
    def test_admin_review_list_filters_by_game_and_user(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=user, game=game, content="Visible")
        Review.objects.create(user=another_user, game=game, content="Autre")

        factory = APIRequestFactory()
        request = factory.get(
            "/api/admin/reviews",
            {"game": str(game.id), "user": str(user.id)},
        )
        force_authenticate(request, user=user)

        response = AdminReviewListView.as_view()(request)

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["id"] == review.id

    def test_admin_review_detail_get_patch_delete(self, user, game, monkeypatch, allow_admin_review_permissions):
        review = Review.objects.create(user=user, game=game, content="Avant")

        monkeypatch.setattr("apps.reviews.views.log_admin_action", lambda **kwargs: None)

        factory = APIRequestFactory()

        request = factory.get(f"/api/admin/reviews/{review.id}")
        force_authenticate(request, user=user)
        response = AdminReviewDetailView.as_view()(request, pk=review.id)

        assert response.status_code == 200
        assert response.data["id"] == review.id

        request = factory.patch(
            f"/api/admin/reviews/{review.id}",
            {"content": "Après"},
            format="json",
        )
        force_authenticate(request, user=user)
        response = AdminReviewDetailView.as_view()(request, pk=review.id)

        assert response.status_code == 200
        review.refresh_from_db()
        assert review.content == "Après"

        request = factory.delete(f"/api/admin/reviews/{review.id}")
        force_authenticate(request, user=user)
        response = AdminReviewDetailView.as_view()(request, pk=review.id)

        assert response.status_code == 204
        assert not Review.objects.filter(pk=review.id).exists()

    @pytest.mark.parametrize(
        "method, expected_permission_class",
        [
            ("GET", "CanReadReview"),
            ("PATCH", "CanEditReview"),
            ("DELETE", "CanDeleteReview"),
            ("POST", None),
        ],
    )
    def test_admin_review_detail_get_permissions(self, method, expected_permission_class, rf):
        view = AdminReviewDetailView()
        request = getattr(rf, method.lower())("/api/admin/reviews/1")
        view.request = request

        permissions = view.get_permissions()

        if expected_permission_class is None:
            assert permissions == []
        else:
            assert permissions[0].__class__.__name__ == expected_permission_class


@pytest.mark.django_db
class TestReviewReportView:
    def test_review_report_creates_report_then_returns_already_reported(self, user, game):
        review = Review.objects.create(user=user, game=game, content="Signalable")

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            f"/api/reviews/{review.id}/report/",
            {"reason": "spam"},
            format="json",
        )

        assert response.status_code == 201
        assert response.data["already_reported"] is False

        response = client.post(
            f"/api/reviews/{review.id}/report/",
            {"reason": "spam"},
            format="json",
        )

        assert response.status_code == 200
        assert response.data["already_reported"] is True


@pytest.mark.django_db
class TestAdminReportViews:
    def test_admin_report_list_filters(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=another_user, game=game, content="Review")

        report = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="spam",
            handled=False,
        )

        ContentReport.objects.create(
            reporter=another_user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=99999,
            reason="spam",
            handled=True,
        )

        factory = APIRequestFactory()
        request = factory.get(
            "/api/admin/reports",
            {
                "target_type": ContentReport.TargetType.REVIEW,
                "target_id": str(review.id),
                "reporter": str(user.id),
                "handled": "false",
            },
        )
        force_authenticate(request, user=user)

        response = AdminReportListView.as_view()(request)

        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]["id"] == report.id

    def test_admin_report_list_filters_handled_true(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=another_user, game=game, content="Review")

        report = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="spam",
            handled=True,
        )

        factory = APIRequestFactory()
        request = factory.get("/api/admin/reports", {"handled": "true"})
        force_authenticate(request, user=user)

        response = AdminReportListView.as_view()(request)

        assert response.status_code == 200
        ids = {row["id"] for row in response.data}
        assert report.id in ids

    def test_admin_report_list_ignores_unknown_handled_value(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=another_user, game=game, content="Review")

        report_false = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="spam",
            handled=False,
        )
        report_true = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id + 1,
            reason="spam",
            handled=True,
        )

        factory = APIRequestFactory()
        request = factory.get("/api/admin/reports", {"handled": "maybe"})
        force_authenticate(request, user=user)

        response = AdminReportListView.as_view()(request)

        assert response.status_code == 200
        ids = {row["id"] for row in response.data}
        assert report_false.id in ids
        assert report_true.id in ids

    def test_admin_report_detail_patch_marks_handled_true_and_false(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=another_user, game=game, content="Review")

        report = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="spam",
            handled=False,
        )

        factory = APIRequestFactory()

        request = factory.patch(
            f"/api/admin/reports/{report.id}",
            {"handled": True},
            format="json",
        )
        force_authenticate(request, user=user)

        response = AdminReportDetailView.as_view()(request, pk=report.id)

        assert response.status_code == 200
        report.refresh_from_db()
        assert report.handled is True
        assert report.handled_by == user
        assert report.handled_at is not None

        request = factory.patch(
            f"/api/admin/reports/{report.id}",
            {"handled": "false"},
            format="json",
        )
        force_authenticate(request, user=user)

        response = AdminReportDetailView.as_view()(request, pk=report.id)

        assert response.status_code == 200
        report.refresh_from_db()
        assert report.handled is False
        assert report.handled_by is None
        assert report.handled_at is None

    def test_admin_report_detail_patch_without_handled_only_saves(self, user, another_user, game, allow_admin_review_permissions):
        review = Review.objects.create(user=another_user, game=game, content="Review")

        report = ContentReport.objects.create(
            reporter=user,
            target_type=ContentReport.TargetType.REVIEW,
            target_id=review.id,
            reason="spam",
            handled=False,
        )

        factory = APIRequestFactory()
        request = factory.patch(
            f"/api/admin/reports/{report.id}",
            {},
            format="json",
        )
        force_authenticate(request, user=user)

        response = AdminReportDetailView.as_view()(request, pk=report.id)

        assert response.status_code == 200
        report.refresh_from_db()
        assert report.handled is False
        assert report.handled_by is None
        assert report.handled_at is None
