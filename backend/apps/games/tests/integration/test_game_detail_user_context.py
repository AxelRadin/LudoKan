import pytest
from rest_framework.test import APIRequestFactory

from apps.games.models import Rating
from apps.games.serializers import GameDetailSerializer
from apps.library.models import UserGame


@pytest.mark.django_db
def test_game_detail_includes_user_library_and_rating(user, game):
    """
    Couvre GameDetailSerializer._get_request_user, get_user_library et get_user_rating (cas avec user + rating).
    """
    # Lier le jeu à l'utilisateur via UserGame
    UserGame.objects.create(user=user, game=game, is_favorite=True)

    # Créer une note pour ce jeu
    Rating.objects.create(
        user=user,
        game=game,
        rating_type=Rating.RATING_TYPE_SUR_10,
        value=8,
    )

    factory = APIRequestFactory()
    request = factory.get(f"/api/games/{game.id}/")
    request.user = user

    serializer = GameDetailSerializer(game, context={"request": request})
    data = serializer.data

    assert data["user_library"] == {"status": UserGame.GameStatus.EN_COURS, "is_favorite": True}
    assert data["user_rating"]["value"] == 8.0
    assert data["user_rating"]["rating_type"] == Rating.RATING_TYPE_SUR_10


@pytest.mark.django_db
def test_game_detail_no_request_has_no_user_context(game):
    """
    Couvre la branche où aucun request n'est présent dans le contexte (request is None).
    """
    serializer = GameDetailSerializer(game, context={})
    data = serializer.data

    assert data["user_library"] is None
    assert data["user_rating"] is None


@pytest.mark.django_db
def test_game_detail_with_user_without_rating(user, game):
    """
    Couvre la branche où l'utilisateur est authentifié mais n'a pas encore noté le jeu (rating is None).
    """
    factory = APIRequestFactory()
    request = factory.get(f"/api/games/{game.id}/")
    request.user = user

    serializer = GameDetailSerializer(game, context={"request": request})
    data = serializer.data

    assert data["user_library"] is None
    assert data["user_rating"] is None
