import pytest
from django.contrib.auth import get_user_model

from apps.games.models import Game, Rating


@pytest.mark.django_db
def test_game_list_uses_efficient_queries(django_assert_max_num_queries, api_client, publisher, genre, platform):
    """Ensure listing games with related data does not trigger N+1 queries."""

    # Create multiple games with related publisher/genres/platforms

    games = []

    for i in range(10):
        game = Game.objects.create(
            igdb_id=5000 + i,
            name=f"Game {i}",
            description="Perf test game",
            publisher=publisher,
        )
        game.genres.add(genre)
        game.platforms.add(platform)
        games.append(game)

    # Expect a small, bounded number of queries thanks to select_related/prefetch_related
    with django_assert_max_num_queries(5):
        response = api_client.get("/api/games/")
        assert response.status_code == 200
        assert len(response.data["results"]) >= len(games)


@pytest.mark.django_db
def test_ratings_list_scales_with_many_ratings(django_assert_max_num_queries, api_client, game, user):
    """Ensure listing many ratings for a single game does not cause N+1 queries."""
    User = get_user_model()

    # Create 150 ratings for the same game
    for i in range(150):
        tmp_user = User.objects.create_user(
            email=f"perf{i}@example.com",
            password="PerfPass123!",
            pseudo=f"perfuser{i}",
        )
        Rating.objects.create(
            user=tmp_user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=8,
        )

    with django_assert_max_num_queries(3):
        response = api_client.get(f"/api/ratings/?game_id={game.id}")
        assert response.status_code == 200
        assert response.data["count"] == 150
        assert len(response.data["results"]) <= 10


@pytest.mark.django_db
def test_game_detail_with_many_ratings_is_efficient(django_assert_max_num_queries, api_client, game, user):
    """Ensure game detail with many ratings remains efficient.

    average_rating and rating_count are precomputed via signals, so retrieving
    the game with many ratings should not perform an extra query per rating.
    """
    User = get_user_model()
    # Create many ratings for the same game
    for i in range(150):
        tmp_user = User.objects.create_user(
            email=f"perf{i}@example.com",
            password="PerfPass123!",
            pseudo=f"perfuser{i}",
        )
        Rating.objects.create(
            user=tmp_user,
            game=game,
            rating_type=Rating.RATING_TYPE_SUR_10,
            value=8,
        )

    # Access the game detail and ensure a bounded number of queries is used
    with django_assert_max_num_queries(5):
        response = api_client.get(f"/api/games/{game.id}/")
        assert response.status_code == 200
        assert response.data["rating_count"] == 150
