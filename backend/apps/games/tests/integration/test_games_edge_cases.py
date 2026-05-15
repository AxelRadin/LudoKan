from datetime import timedelta
from unittest.mock import patch

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.games.models import Game, Rating
from apps.library.models import UserGame
from apps.reviews.models import ContentReport
from apps.users.models import UserRole
from apps.users.tests.constants import TEST_USER_CREDENTIAL


@pytest.fixture
def admin_user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        email="admin_extra@example.com",
        password=TEST_USER_CREDENTIAL,
        pseudo="admin_extra",
    )
    UserRole.objects.create(user=user, role=UserRole.Role.ADMIN)
    return user


@pytest.fixture
def admin_client(admin_user):
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.mark.django_db
class TestGamesEdgeCases:
    """Tests ciblés pour couvrir les cas limites et les branches non testées dans apps/games."""

    # 2. Serializers: AdminRatingListSerializer fields
    def test_admin_rating_list_serializer_fields(self, admin_client, user, game):
        Rating.objects.create(user=user, game=game, rating_type=Rating.RATING_TYPE_ETOILES, value=4)
        url = reverse("games:admin-rating-list")
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        result = response.data["results"][0]
        assert "user_pseudo" in result
        assert "game_name" in result
        assert result["user_pseudo"] == user.pseudo
        assert result["game_name"] == game.name

    # 3. Views: AdminGameListView created_after (l.475)
    def test_admin_game_list_created_after(self, admin_client, game, publisher):
        # Créer un jeu plus ancien manuellement avec un publisher (requis par contrainte NOT NULL)
        old_game = Game.objects.create(igdb_id=99999, name="Old Game", publisher=publisher)
        Game.objects.filter(id=old_game.id).update(created_at=timezone.now() - timedelta(days=10))

        url = reverse("games:admin-game-list")
        after = (timezone.now() - timedelta(days=5)).isoformat()

        response = admin_client.get(url, {"created_after": after})
        assert response.status_code == status.HTTP_200_OK
        ids = [g["id"] for g in response.data["results"]]
        assert game.id in ids
        assert old_game.id not in ids

    # 4. Views: GameViewSet.retrieve healing exception (l.127)
    def test_game_retrieve_healing_exception(self, authenticated_api_client, publisher):
        # Un jeu "stub" (pas de description)
        stub = Game.objects.create(igdb_id=88888, name="Stub", publisher=publisher)
        url = reverse("games:game-detail", kwargs={"pk": stub.id})

        # On mock igdb_request pour qu'il renvoie des données mais que get_or_create_game_from_igdb lève une erreur
        mock_igdb = [{"id": 88888, "name": "Healed"}]
        with patch("apps.games.views.igdb_client.igdb_request", return_value=mock_igdb):
            with patch("apps.games.views.get_or_create_game_from_igdb", side_effect=Exception("Heal fail")):
                response = authenticated_api_client.get(url)

        # Doit quand même renvoyer le stub (le try/except pass à la ligne 127 est couvert)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == stub.id

    # 5. Views: AdminReportsGamesView PDF export (l.695)
    def test_admin_reports_games_pdf_export(self, admin_client):
        url = reverse("games:admin-reports-games")
        response = admin_client.get(url, {"export": "pdf"})
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "application/pdf"
        assert response.content[:4] == b"%PDF"

    # 6. Views: GameStatsView status mapping (l.872)
    def test_game_stats_status_mapping(self, api_client, game, user, another_user):
        # Créer des UserGame avec différents statuts
        UserGame.objects.create(user=user, game=game, status=UserGame.GameStatus.EN_COURS)
        UserGame.objects.create(user=another_user, game=game, status=UserGame.GameStatus.ABANDONNE)

        url = reverse("games:game-stats", kwargs={"game_id": game.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        stats = response.data["owners_by_status"]
        assert stats["en_cours"] == 1
        assert stats["abandonne"] == 1
        assert stats["termine"] == 0

    # 7. Views: RatingReportView.post (l.634)
    def test_rating_report_post(self, authenticated_api_client, game, another_user):
        rating = Rating.objects.create(user=another_user, game=game, value=4, rating_type=Rating.RATING_TYPE_ETOILES)
        url = reverse("games:rating-report", kwargs={"pk": rating.id})
        response = authenticated_api_client.post(url, {"reason": "Test report"}, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert ContentReport.objects.filter(target_id=rating.id).exists()

    # 8. Views: GameByIgdbIdView branches (l.295, 301, 337)
    def test_game_by_igdb_id_proxy_branch(self, api_client):
        igdb_id = 77777
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})

        mock_igdb = [
            {
                "id": igdb_id,
                "name": "Proxy Game",
                "summary": "Desc",
                "cover": {"url": "//images.igdb.com/t_thumb/co1.jpg"},
                "first_release_date": 1609459200,
                "platforms": [{"id": 1, "name": "P1"}],
                "genres": [{"id": 1, "name": "G1"}],
            }
        ]

        with patch("apps.games.views.igdb_client.igdb_request", return_value=mock_igdb):
            # Jeu absent en DB -> Proxy branch (l.301)
            response = api_client.get(url)
            assert response.status_code == status.HTTP_200_OK
            assert response.data["name"] == "Proxy Game"
            assert response.data.get("django_id") is None

    def test_game_by_igdb_id_not_found_on_igdb_miss(self, api_client):
        igdb_id = 77778
        url = reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})
        with patch("apps.games.views.igdb_client.igdb_request", return_value=[]):
            # Absent DB + Absent IGDB -> 404 (l.337)
            response = api_client.get(url)
            assert response.status_code == status.HTTP_404_NOT_FOUND

    # 9. Serializers: IgdbResolveSerializer (l.377-386)
    def test_igdb_resolve_serializer_usage(self, authenticated_api_client):
        url = reverse("games:game-resolve-from-igdb")
        data = {
            "igdb_id": 12345,
            "name": "Full Resolve",
            "cover_url": "http://example.com/cover.jpg",
            "release_date": "2021-01-01",
            "summary": "Full summary text",
            "platforms": [{"id": 1, "name": "PC"}],
            "genres": [{"id": 1, "name": "RPG"}],
            "screenshots": [{"id": 101, "url": "http://ex.com/s1.jpg"}],
            "videos": [{"id": 201, "video_id": "v1", "name": "Trailer"}],
        }
        response = authenticated_api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["game_id"] is not None
