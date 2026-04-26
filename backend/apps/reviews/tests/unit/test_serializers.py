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
        request = factory.post("/api/reviews/")
        request.user = user
        serializer = ReviewWriteSerializer(
            data={"game": game.id, "rating_value": 4, "content": "ok content"},
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors

    def test_review_write_create_sets_user_from_context(self, user, game):
        request = factory.post("/api/reviews/")
        request.user = user

        serializer = ReviewWriteSerializer(
            data={"game": game.id, "rating_value": 4, "content": "Great game!"},
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
            data={"game": game.id, "rating_value": 3, "content": "Another review"},
            context={"request": request},
        )

        with pytest.raises(serializers.ValidationError) as exc:
            serializer.is_valid(raise_exception=True)

        assert "deja laisse un avis pour ce jeu" in str(exc.value)

    def test_review_write_validate_requires_rating_on_create(self, user, game):
        request = factory.post("/api/reviews/")
        request.user = user

        serializer = ReviewWriteSerializer(
            data={"game": game.id, "content": "Seulement du texte"},
            context={"request": request},
        )
        assert not serializer.is_valid()
        assert "rating_value" in serializer.errors

    def test_review_write_create_with_rating_value(self, user, game):
        request = factory.post("/api/reviews/")
        request.user = user

        serializer = ReviewWriteSerializer(
            data={"game": game.id, "rating_value": 4, "content": "Nice game"},
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors
        review = serializer.save()

        assert review.rating is not None
        assert review.rating.value == 4
        assert review.rating.user == user
        assert review.rating.game == game

    def test_review_write_update_existing_rating(self, user, game):
        from apps.games.models import Rating

        rating = Rating.objects.create(user=user, game=game, value=3, rating_type=Rating.RATING_TYPE_ETOILES, normalized_value=6)
        review = Review.objects.create(user=user, game=game, content="Initial", rating=rating)

        request = factory.patch(f"/api/reviews/{review.id}/")
        request.user = user

        serializer = ReviewWriteSerializer(
            instance=review,
            data={"rating_value": 5},
            partial=True,
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors
        updated_review = serializer.save()

        assert updated_review.rating.id == rating.id
        assert updated_review.rating.value == 5

    def test_review_write_update_create_rating(self, user, game):
        review = Review.objects.create(user=user, game=game, content="Initial without rating")

        request = factory.patch(f"/api/reviews/{review.id}/")
        request.user = user

        serializer = ReviewWriteSerializer(
            instance=review,
            data={"rating_value": 4},
            partial=True,
            context={"request": request},
        )
        assert serializer.is_valid(), serializer.errors
        updated_review = serializer.save()

        assert updated_review.rating is not None
        assert updated_review.rating.value == 4
