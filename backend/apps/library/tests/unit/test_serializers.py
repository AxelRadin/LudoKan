import pytest
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.library.models import UserGame, UserLibrary
from apps.library.serializers import UserGameSerializer, UserLibrarySerializer

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


@pytest.mark.django_db
class TestUserLibrarySerializer:
    def test_validate_name_rejects_blank(self, user):
        request = factory.post("/api/me/collections/")
        request.user = user
        ser = UserLibrarySerializer(data={"name": "   "}, context={"request": request})
        assert ser.is_valid() is False
        assert "name" in ser.errors

    def test_validate_name_raises_when_only_whitespace(self, user):
        request = factory.post("/api/me/collections/")
        request.user = user
        ser = UserLibrarySerializer(context={"request": request})
        with pytest.raises(serializers.ValidationError, match="vide"):
            ser.validate_name("   ")

    def test_validate_color_returns_normalized_hex(self, user):
        request = factory.post("/api/me/collections/")
        request.user = user
        ser = UserLibrarySerializer(context={"request": request})
        assert ser.validate_color("  #d32f2f  ") == "#d32f2f"

    def test_validate_color_rejects_invalid_hex(self, user):
        request = factory.post("/api/me/collections/")
        request.user = user
        ser = UserLibrarySerializer(
            data={"name": "Ok", "color": "red"},
            context={"request": request},
        )
        assert ser.is_valid() is False

    def test_validate_color_accepts_empty(self, user):
        request = factory.post("/api/me/collections/")
        request.user = user
        ser = UserLibrarySerializer(
            data={"name": "Ok", "color": ""},
            context={"request": request},
        )
        assert ser.is_valid() is True

    def test_system_collection_cannot_rename(self, user):
        lib = UserLibrary.objects.create(
            user=user,
            name="Jeux Steam",
            system_key=UserLibrary.SystemKey.STEAM,
            sort_order=1,
        )
        request = factory.patch(f"/api/me/collections/{lib.id}/")
        request.user = user
        ser = UserLibrarySerializer(
            instance=lib,
            data={"name": "Hacked"},
            partial=True,
            context={"request": request},
        )
        assert ser.is_valid() is False
        assert ser.errors
