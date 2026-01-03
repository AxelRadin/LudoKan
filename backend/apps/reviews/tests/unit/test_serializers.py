import pytest
from rest_framework import serializers
from rest_framework.test import APIRequestFactory

from apps.reviews.models import Review
from apps.reviews.serializers import ReviewReadSerializer, ReviewWriteSerializer

factory = APIRequestFactory()


@pytest.fixture
def review(user, game):
    return Review.objects.create(user=user, game=game, content="Test review")


@pytest.mark.django_db
class TestReviewSerializers:
    def test_review_read_serializer_outputs_nested_user_and_game(self, review, api_client):
        serializer = ReviewReadSerializer(instance=review)
        data = serializer.data

        assert "user" in data
        assert "game" in data
        assert data["id"] == review.id

    def test_review_write_validate_content_calls_validator(self, user, game):
        serializer = ReviewWriteSerializer(data={"game": game.id, "rating": None, "content": "ok content"})
        assert serializer.is_valid(), serializer.errors

    def test_review_write_create_sets_user_from_context(self, user, game):
        request = factory.post("/api/reviews/")
        request.user = user

        serializer = ReviewWriteSerializer(
            data={"game": game.id, "rating": None, "content": "Great game!"},
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors

        review = serializer.save()
        assert review.user == user
        assert review.game == game

    def test_review_write_validate_prevents_duplicate_review(self, user, game):
        request = factory.post("/api/reviews/")
        request.user = user

        Review.objects.create(user=user, game=game, content="Existing review")

        serializer = ReviewWriteSerializer(
            instance=None,
            data={"game": game.id, "rating": None, "content": "Another review"},
            context={"request": request},
        )

        with pytest.raises(serializers.ValidationError) as exc:
            serializer.is_valid(raise_exception=True)

        assert "deja laisse un avis pour ce jeu" in str(exc.value)
