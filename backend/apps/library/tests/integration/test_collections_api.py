import pytest
from rest_framework import status

from apps.library.models import UserGame, UserLibrary


def _unwrap_list(response):
    d = response.data
    if isinstance(d, dict) and "results" in d:
        return d["results"]
    return d


@pytest.mark.django_db
class TestCollectionsAPI:
    url = "/api/me/collections/"

    def test_list_hides_ma_ludotheque_even_after_adding_game(self, jwt_authenticated_client, user, game):
        r = jwt_authenticated_client.post(
            "/api/me/games/",
            {"game_id": game.id, "status": "EN_COURS"},
            format="json",
        )
        assert r.status_code == status.HTTP_201_CREATED
        assert "collection_ids" in r.data
        assert r.data["collection_ids"] == []

        r2 = jwt_authenticated_client.get(self.url)
        assert r2.status_code == 200
        rows = _unwrap_list(r2)
        keys = {row.get("system_key") for row in rows}
        assert "MA_LUDOTHEQUE" not in keys

    def test_create_custom_collection(self, jwt_authenticated_client, user):
        r = jwt_authenticated_client.post(self.url, {"name": "  Coop  "}, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data["name"] == "Coop"
        assert r.data["is_system"] is False
        assert r.data["system_key"] == ""

    def test_cannot_delete_system_collection(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        lib = UserLibrary.objects.get(user=user, system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE)
        r = jwt_authenticated_client.delete(f"{self.url}{lib.id}/")
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_add_and_remove_entry(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        ug = UserGame.objects.get(user=user, game=game)
        r_col = jwt_authenticated_client.post(self.url, {"name": "Test liste"}, format="json")
        assert r_col.status_code == status.HTTP_201_CREATED
        col_id = r_col.data["id"]

        r_add = jwt_authenticated_client.post(f"{self.url}{col_id}/entries/", {"user_game_id": ug.id}, format="json")
        assert r_add.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)

        r_del = jwt_authenticated_client.delete(f"{self.url}{col_id}/entries/{ug.id}/")
        assert r_del.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_custom_collection_keeps_user_game(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        ug = UserGame.objects.get(user=user, game=game)
        r_col = jwt_authenticated_client.post(self.url, {"name": "Temp"}, format="json")
        col_id = r_col.data["id"]
        jwt_authenticated_client.post(f"{self.url}{col_id}/entries/", {"user_game_id": ug.id}, format="json")

        r_del_col = jwt_authenticated_client.delete(f"{self.url}{col_id}/")
        assert r_del_col.status_code == status.HTTP_204_NO_CONTENT
        assert UserGame.objects.filter(pk=ug.pk).exists()
        assert not UserLibrary.objects.filter(pk=col_id).exists()

    def test_public_collections_only_visible(self, jwt_authenticated_client, api_client, user):
        r = jwt_authenticated_client.post(self.url, {"name": "Publique", "is_visible_on_profile": True}, format="json")
        assert r.status_code == status.HTTP_201_CREATED
        jwt_authenticated_client.post(self.url, {"name": "Privée", "is_visible_on_profile": False}, format="json")

        r_pub = api_client.get(f"/api/users/{user.pseudo}/collections/")
        assert r_pub.status_code == 200
        pub_rows = _unwrap_list(r_pub)
        names = {row["name"] for row in pub_rows}
        assert "Publique" in names
        assert "Privée" not in names

    def test_games_list_ignores_non_numeric_collection_param(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        r = jwt_authenticated_client.get("/api/me/games/?collection=not-a-number")
        assert r.status_code == 200
        rows = _unwrap_list(r)
        assert len(rows) >= 1

    def test_add_entry_requires_user_game_id(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        r_col = jwt_authenticated_client.post(self.url, {"name": "Need ug"}, format="json")
        col_id = r_col.data["id"]
        r = jwt_authenticated_client.post(f"{self.url}{col_id}/entries/", {}, format="json")
        assert r.status_code == 400

    def test_remove_entry_bad_user_game_id_returns_400(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        r_col = jwt_authenticated_client.post(self.url, {"name": "Rm bad"}, format="json")
        col_id = r_col.data["id"]
        r = jwt_authenticated_client.delete(f"{self.url}{col_id}/entries/notint/")
        assert r.status_code == 400

    def test_remove_entry_missing_returns_404(self, jwt_authenticated_client, user, game):
        jwt_authenticated_client.post("/api/me/games/", {"game_id": game.id, "status": "EN_COURS"}, format="json")
        r_col = jwt_authenticated_client.post(self.url, {"name": "Rm 404"}, format="json")
        col_id = r_col.data["id"]
        r = jwt_authenticated_client.delete(f"{self.url}{col_id}/entries/999999/")
        assert r.status_code == 404
