import pytest
from rest_framework import status

from apps.library.models import UserGame, UserLibrary


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
        assert "collection_ids" in response.data
        assert isinstance(response.data["collection_ids"], list)

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

    def test_list_games_collection_filter_foreign_library_returns_empty(self, authenticated_api_client, user, another_user, game):
        foreign_col = UserLibrary.objects.create(user=another_user, name="Autre", system_key="")
        UserGame.objects.create(user=user, game=game)
        response = authenticated_api_client.get(f"{self.endpoint}?collection={foreign_col.pk}")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["results"] == []

    def test_list_games_filtered_by_owned_collection(self, authenticated_api_client, user, game):
        r_game = authenticated_api_client.post(self.endpoint, {"game_id": game.id, "status": "EN_COURS"}, format="json")
        assert r_game.status_code == status.HTTP_201_CREATED
        ug_id = r_game.data["id"]

        r_col = authenticated_api_client.post("/api/me/collections/", {"name": "Vue test"}, format="json")
        assert r_col.status_code == status.HTTP_201_CREATED
        col_id = r_col.data["id"]

        r_add = authenticated_api_client.post(
            f"/api/me/collections/{col_id}/entries/",
            {"user_game_id": ug_id},
            format="json",
        )
        assert r_add.status_code in (
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        )

        response = authenticated_api_client.get(f"{self.endpoint}?collection={col_id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == ug_id
