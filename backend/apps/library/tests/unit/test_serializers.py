import pytest
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.library.models import UserGame
from apps.library.serializers import UserGameSerializer

User = get_user_model()
factory = APIRequestFactory()


@pytest.mark.django_db
class TestUserGameSerializer:
    def test_validate_status_rejects_invalid_value(self, user, game):
        serializer = UserGameSerializer(instance=UserGame(user=user, game=game), data={"status": "INVALID"}, partial=True)

        with pytest.raises(serializers.ValidationError) as exc:
            serializer.validate_status("INVALID")

        assert "Le statut doit être l’un de" in str(exc.value)

    def test_create_requires_game_id(self, user):
        request = factory.post("/api/library/")
        request.user = user
        serializer = UserGameSerializer(data={"status": UserGame.GameStatus.EN_COURS}, context={"request": request})

        serializer.is_valid(raise_exception=True)

        with pytest.raises(serializers.ValidationError) as exc:
            serializer.save()

        assert "game_id" in exc.value.detail
        assert "Ce champ est obligatoire." in str(exc.value.detail)

    def test_create_raises_when_game_not_found(self, user):
        request = factory.post("/api/library/")
        request.user = user
        serializer = UserGameSerializer(data={"status": UserGame.GameStatus.EN_COURS, "game_id": 999}, context={"request": request})

        serializer.is_valid(raise_exception=True)

        with pytest.raises(serializers.ValidationError) as exc:
            serializer.save()

        assert "game_id" in exc.value.detail
        assert "Jeu non trouvé." in str(exc.value.detail)
