"""
Tests de non-régression : consultation read-only.

Garantit que :
- GET /api/games/<id>/
- GET /api/games/igdb/<igdb_id>/

...ne créent jamais de Game ni de UserGame, quelle que soit la situation
(authentifié / anonyme, jeu existant / inexistant).

Vérifie également le contrat de la réponse NormalizedGame :
clés présentes, types corrects.
"""

from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status

from apps.games.models import Game
from apps.library.models import UserGame

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

NORMALIZED_GAME_KEYS = {
    "django_id",
    "igdb_id",
    "name",
    "summary",
    "cover_url",
    "release_date",
    "platforms",
    "genres",
    "user_library",
    "user_rating",
}

IGDB_MOCK_RESPONSE = [
    {
        "id": 77701,
        "name": "IGDB Readonly Game",
        "summary": "A read-only IGDB game",
        "cover": {"url": "//images.igdb.com/t_thumb/ro.jpg"},
        "first_release_date": 1609459200,
        "platforms": [{"id": 6, "name": "PC"}],
        "genres": [{"id": 5, "name": "Shooter"}],
        "collections": [],
        "franchises": [],
    }
]


# ---------------------------------------------------------------------------
# Tests — GET /api/games/<id>/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameDetailReadOnly:
    """GET /api/games/<id>/ — lecture seule, jamais de création."""

    def _url(self, game_id):
        return reverse("games:game-detail", kwargs={"pk": game_id})

    # -- Contrat de réponse --------------------------------------------------

    def test_anonymous_returns_normalized_game_contract(self, api_client, game):
        """Anonyme : toutes les clés NormalizedGame sont présentes."""
        response = api_client.get(self._url(game.id))

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        missing = NORMALIZED_GAME_KEYS - data.keys()
        assert not missing, f"Clés manquantes dans la réponse : {missing}"

    def test_anonymous_user_fields_are_null(self, api_client, game):
        """Anonyme : user_library et user_rating sont null."""
        response = api_client.get(self._url(game.id))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["user_library"] is None
        assert response.data["user_rating"] is None

    def test_django_id_matches_game_pk(self, api_client, game):
        """django_id dans la réponse correspond bien à l'ID du Game en base."""
        response = api_client.get(self._url(game.id))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["django_id"] == game.id

    def test_igdb_id_is_integer_or_null(self, api_client, game):
        """igdb_id est un entier (ou null) — pas une chaîne."""
        response = api_client.get(self._url(game.id))

        igdb_id = response.data["igdb_id"]
        assert igdb_id is None or isinstance(igdb_id, int)

    # -- Pas de création -----------------------------------------------------

    def test_anonymous_does_not_create_usergame(self, api_client, game):
        """Une consultation anonyme ne crée aucun UserGame."""
        before = UserGame.objects.count()
        api_client.get(self._url(game.id))
        assert UserGame.objects.count() == before

    def test_authenticated_does_not_create_usergame(self, authenticated_api_client, game):
        """Une consultation authentifiée ne crée aucun UserGame."""
        before = UserGame.objects.count()
        authenticated_api_client.get(self._url(game.id))
        assert UserGame.objects.count() == before

    def test_authenticated_does_not_create_new_game(self, authenticated_api_client, game):
        """Une consultation authentifiée ne crée aucun Game supplémentaire."""
        before = Game.objects.count()
        authenticated_api_client.get(self._url(game.id))
        assert Game.objects.count() == before

    # -- Authentifié : données utilisateur injectées -------------------------

    def test_authenticated_with_usergame_injects_user_library(self, authenticated_api_client, user, game):
        """Avec un UserGame existant, user_library est correctement injecté."""
        UserGame.objects.create(user=user, game=game, status="TERMINE", is_favorite=True)

        response = authenticated_api_client.get(self._url(game.id))

        assert response.status_code == status.HTTP_200_OK
        lib = response.data["user_library"]
        assert lib is not None
        assert lib["status"] == "TERMINE"
        assert lib["is_favorite"] is True

    # -- 404 -----------------------------------------------------------------

    def test_unknown_id_returns_404(self, api_client):
        """Un ID inexistant renvoie 404."""
        response = api_client.get(self._url(999999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_unknown_id_does_not_create_game(self, api_client):
        """Un appel vers un ID inexistant ne crée aucun Game."""
        before = Game.objects.count()
        api_client.get(self._url(999999))
        assert Game.objects.count() == before


# ---------------------------------------------------------------------------
# Tests — GET /api/games/igdb/<igdb_id>/
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGameByIgdbIdReadOnly:
    """GET /api/games/igdb/<igdb_id>/ — lecture seule, jamais de création."""

    def _url(self, igdb_id):
        return reverse("games:game-by-igdb", kwargs={"igdb_id": igdb_id})

    # -- Jeu existant en DB : pas de création, contrat OK -------------------

    def test_existing_game_no_usergame_created_anonymous(self, api_client, game):
        """Anonyme sur jeu en DB : aucun UserGame créé."""
        before = UserGame.objects.count()
        api_client.get(self._url(game.igdb_id))
        assert UserGame.objects.count() == before

    def test_existing_game_no_usergame_created_authenticated(self, authenticated_api_client, game):
        """Authentifié sur jeu en DB : aucun UserGame créé."""
        before = UserGame.objects.count()
        authenticated_api_client.get(self._url(game.igdb_id))
        assert UserGame.objects.count() == before

    def test_existing_game_no_game_created(self, api_client, game):
        """Consultation par igdb_id sur jeu existant : aucun Game supplémentaire."""
        before = Game.objects.count()
        api_client.get(self._url(game.igdb_id))
        assert Game.objects.count() == before

    def test_existing_game_contract_keys(self, api_client, game):
        """Jeu en DB : toutes les clés NormalizedGame sont présentes."""
        response = api_client.get(self._url(game.igdb_id))

        assert response.status_code == status.HTTP_200_OK
        missing = NORMALIZED_GAME_KEYS - response.data.keys()
        assert not missing, f"Clés manquantes : {missing}"

    def test_existing_game_django_id_set(self, api_client, game):
        """Jeu en DB : django_id est renseigné."""
        response = api_client.get(self._url(game.igdb_id))
        assert response.data["django_id"] == game.id

    # -- Jeu absent de DB, trouvé sur IGDB : pas de création ----------------

    def test_igdb_only_game_no_game_created(self, api_client):
        """Jeu absent de DB, fallback IGDB : aucun Game créé en base."""
        before = Game.objects.count()
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            api_client.get(self._url(77701))
        assert Game.objects.count() == before

    def test_igdb_only_game_no_usergame_created(self, api_client):
        """Jeu absent de DB, fallback IGDB : aucun UserGame créé."""
        before = UserGame.objects.count()
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            api_client.get(self._url(77701))
        assert UserGame.objects.count() == before

    def test_igdb_only_game_django_id_is_null(self, api_client):
        """Jeu absent de DB : django_id est null dans la réponse."""
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            response = api_client.get(self._url(77701))

        assert response.status_code == status.HTTP_200_OK
        assert response.data["django_id"] is None

    def test_igdb_only_game_user_fields_null(self, api_client):
        """Jeu absent de DB : user_library et user_rating sont null."""
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            response = api_client.get(self._url(77701))

        assert response.data["user_library"] is None
        assert response.data["user_rating"] is None

    def test_igdb_only_authenticated_no_usergame_created(self, authenticated_api_client):
        """Authentifié sur jeu IGDB-only : aucun UserGame créé."""
        before = UserGame.objects.count()
        with patch("apps.games.views.igdb_client.igdb_request", return_value=IGDB_MOCK_RESPONSE):
            authenticated_api_client.get(self._url(77701))
        assert UserGame.objects.count() == before

    # -- Jeu absent partout --------------------------------------------------

    def test_absent_everywhere_returns_404(self, api_client):
        """Jeu absent de DB et d'IGDB : 404."""
        with patch("apps.games.views.igdb_client.igdb_request", return_value=[]):
            response = api_client.get(self._url(99999))
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_absent_everywhere_no_game_created(self, api_client):
        """Jeu absent partout : aucun Game créé lors du 404."""
        before = Game.objects.count()
        with patch("apps.games.views.igdb_client.igdb_request", return_value=[]):
            api_client.get(self._url(99999))
        assert Game.objects.count() == before
