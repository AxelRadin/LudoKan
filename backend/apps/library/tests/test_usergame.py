import pytest
from django.db import IntegrityError
from rest_framework import status

from apps.library.models import UserGame


@pytest.mark.django_db
class TestUserGameModel:
    """Tests pour le modèle UserGame"""

    def test_create_usergame(self, user, game):
        ug = UserGame.objects.create(user=user, game=game)
        assert ug.id is not None
        assert ug.user == user
        assert ug.game == game
        assert ug.status == UserGame.GameStatus.EN_COURS
        assert isinstance(ug.date_added, type(ug.date_added))

    def test_str(self, user, game):
        ug = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.TERMINE)
        assert str(ug) == f"UserGame: {user} - {game} ({ug.status})"

    def test_is_owned_by(self, user, game, another_user):
        ug = UserGame.objects.create(user=user, game=game)
        assert ug.is_owned_by(user) is True
        assert ug.is_owned_by(another_user) is False

    def test_unique_constraint(self, user, game):
        UserGame.objects.create(user=user, game=game)
        with pytest.raises(IntegrityError):
            UserGame.objects.create(user=user, game=game)


@pytest.mark.django_db
class TestUserGameAPI:
    """Tests CRUD API pour UserGame"""

    endpoint = "/api/me/games/"

    def test_create_usergame(self, authenticated_api_client, user, game):
        data = {"game_id": game.id, "status": "EN_COURS"}
        response = authenticated_api_client.post(self.endpoint, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["game"]["id"] == game.id
        assert response.data["status"] == "EN_COURS"

    def test_create_usergame_duplicate(self, authenticated_api_client, user, game):
        UserGame.objects.create(user=user, game=game)
        data = {"game_id": game.id, "status": "EN_COURS"}
        response = authenticated_api_client.post(self.endpoint, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_usergames(self, authenticated_api_client, user, game):
        user_game = UserGame.objects.create(user=user, game=game)

        response = authenticated_api_client.get("/api/me/games/")

        assert response.status_code == 200
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == user_game.id

    def test_update_status(self, authenticated_api_client, user, game):
        ug = UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        patch_endpoint = f"{self.endpoint}{ug.game.id}/"
        data = {"status": "TERMINE"}
        response = authenticated_api_client.patch(patch_endpoint, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        ug.refresh_from_db()
        assert ug.status == "TERMINE"
        assert response.data["status"] == "TERMINE"

    def test_update_status_invalid(self, authenticated_api_client, user, game):
        ug = UserGame.objects.create(user=user, game=game)
        patch_endpoint = f"{self.endpoint}{ug.game.id}/"
        data = {"status": "INVALID"}
        response = authenticated_api_client.patch(patch_endpoint, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_usergame(self, authenticated_api_client, user, game):
        ug = UserGame.objects.create(user=user, game=game)
        delete_endpoint = f"{self.endpoint}{ug.game.id}/"
        response = authenticated_api_client.delete(delete_endpoint)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert UserGame.objects.filter(user=user, game=game).count() == 0

    def test_delete_usergame_not_owned(self, authenticated_api_client, another_user, game):
        ug = UserGame.objects.create(user=another_user, game=game)
        delete_endpoint = f"{self.endpoint}{ug.game.id}/"
        response = authenticated_api_client.delete(delete_endpoint)
        assert response.status_code == status.HTTP_404_NOT_FOUND
