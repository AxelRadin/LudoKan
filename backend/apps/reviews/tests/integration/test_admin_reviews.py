import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.games.models import Game
from apps.reviews.models import Review
from apps.users.models import AdminAction, UserRole

User = get_user_model()


@pytest.fixture
def admin_user(db):
    """Utilisateur admin avec rôle ADMIN pour les endpoints reviews admin."""
    user = User.objects.create_user(
        email="adminreviews@example.com",
        password="AdminPass123!",
        pseudo="adminreviews",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    return user


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def authenticated_client(user):
    """Client authentifié en tant qu'utilisateur normal (non admin)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def moderator_user(db):
    """Utilisateur avec rôle MODERATOR (lecture seule sur endpoints admin)."""
    user = User.objects.create_user(
        email="modreviews@example.com",
        password="ModPass123!",
        pseudo="modreviews",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.MODERATOR)
    return user


@pytest.fixture
def moderator_client(moderator_user):
    client = APIClient()
    client.force_authenticate(user=moderator_user)
    return client


@pytest.mark.django_db
class TestAdminReviewEndpoints:
    def test_admin_can_list_reviews_with_review_read_permission(self, admin_client, user, user2, game):
        # Contenu suffisamment long pour satisfaire le validateur (min 4 caractères)
        Review.objects.create(user=user, game=game, content="Review 1 ok")
        # Utiliser un autre utilisateur pour respecter la contrainte d'unicité (user, game)
        Review.objects.create(user=user2, game=game, content="Review 2 ok")

        url = "/api/admin/reviews/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_admin_list_reviews_can_filter_by_game_and_user(self, admin_client, user, user2, game):
        # Créer un autre jeu pour tester le filtre ?game=
        other_game = Game.objects.create(
            igdb_id=9999,
            name="Other Game",
            description="",
            publisher=game.publisher,
        )
        other_game.platforms.set(game.platforms.all())
        other_game.genres.set(game.genres.all())

        r1 = Review.objects.create(user=user, game=game, content="Review game1 user1")
        r2 = Review.objects.create(user=user2, game=other_game, content="Review game2 user2")

        # Filtre par game
        url = "/api/admin/reviews/"
        resp_game = admin_client.get(url, {"game": game.id})
        assert resp_game.status_code == status.HTTP_200_OK
        assert len(resp_game.data) == 1
        assert resp_game.data[0]["id"] == r1.id

        # Filtre par user
        resp_user = admin_client.get(url, {"user": user2.id})
        assert resp_user.status_code == status.HTTP_200_OK
        assert len(resp_user.data) == 1
        assert resp_user.data[0]["id"] == r2.id

    def test_non_admin_cannot_list_reviews(self, authenticated_client, user, game):
        Review.objects.create(user=user, game=game, content="Review 1")

        url = "/api/admin/reviews/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_moderator_can_list_but_cannot_edit_or_delete(self, moderator_client, user, user2, game):
        review = Review.objects.create(user=user, game=game, content="Mod visible review")
        Review.objects.create(user=user2, game=game, content="Another review")

        # Listing autorisé
        list_url = "/api/admin/reviews/"
        list_response = moderator_client.get(list_url)
        assert list_response.status_code == status.HTTP_200_OK
        assert len(list_response.data) == 2

        # PATCH interdit
        detail_url = f"/api/admin/reviews/{review.id}/"
        patch_response = moderator_client.patch(detail_url, {"content": "Mod try update"}, format="json")
        assert patch_response.status_code == status.HTTP_403_FORBIDDEN

        # DELETE interdit
        delete_response = moderator_client.delete(detail_url)
        assert delete_response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_patch_review_and_logs_action(self, admin_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Original content")

        url = f"/api/admin/reviews/{review.id}/"
        payload = {"content": "Updated by admin"}

        response = admin_client.patch(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.content == "Updated by admin"

        # Log AdminAction créé
        assert AdminAction.objects.filter(
            action_type="review.edit",
            target_type="review",
            target_id=review.id,
        ).exists()

    def test_admin_can_delete_review_and_logs_action(self, admin_client, user, game):
        review = Review.objects.create(user=user, game=game, content="To be deleted")

        url = f"/api/admin/reviews/{review.id}/"
        response = admin_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Review.objects.filter(id=review.id).exists()

        # Log AdminAction créé
        assert AdminAction.objects.filter(
            action_type="review.delete",
            target_type="review",
            target_id=review.id,
        ).exists()

    def test_non_admin_cannot_patch_or_delete_review(self, authenticated_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Protected review")

        url = f"/api/admin/reviews/{review.id}/"

        # PATCH
        response_patch = authenticated_client.patch(url, {"content": "Hack"}, format="json")
        assert response_patch.status_code == status.HTTP_403_FORBIDDEN

        # DELETE
        response_delete = authenticated_client.delete(url)
        assert response_delete.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_get_review_detail(self, admin_client, user, game):
        review = Review.objects.create(user=user, game=game, content="Detail review")

        url = f"/api/admin/reviews/{review.id}/"
        response = admin_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == review.id

    def test_admin_review_detail_other_method_uses_no_permissions(self, admin_client, user, game):
        """
        Appel OPTIONS pour couvrir la branche else de get_permissions.
        """
        review = Review.objects.create(user=user, game=game, content="Options review")

        url = f"/api/admin/reviews/{review.id}/"
        response = admin_client.options(url)

        # Le statut exact dépend de DRF, on vérifie juste qu'on n'a pas d'erreur serveur.
        assert response.status_code in {status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_405_METHOD_NOT_ALLOWED}
