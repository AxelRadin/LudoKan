import pytest
from django.db import IntegrityError

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
