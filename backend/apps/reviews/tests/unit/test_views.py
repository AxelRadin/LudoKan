import pytest
from rest_framework.test import APIClient

from apps.reviews.models import Review
from apps.reviews.views import IsOwnerOrReadOnly


@pytest.fixture
def another_user(user2):
    return user2


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

    def test_create_review_associates_authenticated_user(self, user, game):
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.post(
            "/api/reviews/",
            {"game": game.id, "content": "Nice game!", "rating": None},
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
