"""Tests unitaires directs sur GameFilter.filter_search (branches early-return)."""

import uuid

import pytest

from apps.games.filters import GameFilter
from apps.games.models import Game, Publisher


def _publisher():
    return Publisher.objects.create(
        name=f"Pub GameFilterSearch {uuid.uuid4().hex[:10]}",
        description="",
    )


@pytest.mark.django_db
class TestGameFilterSearchMethod:
    """Couvre la ligne `return queryset` quand la valeur est vide / blanche."""

    def test_filter_search_none_returns_same_queryset(self):
        Game.objects.create(igdb_id=9001, name="Test", publisher=_publisher())
        qs = Game.objects.all()
        flt = GameFilter()
        out = flt.filter_search(qs, "search", None)
        assert list(out) == list(qs)

    def test_filter_search_empty_string_returns_same_queryset(self):
        Game.objects.create(igdb_id=9002, name="Other", publisher=_publisher())
        qs = Game.objects.all()
        flt = GameFilter()
        out = flt.filter_search(qs, "search", "")
        assert list(out) == list(qs)

    def test_filter_search_whitespace_only_returns_same_queryset(self):
        Game.objects.create(igdb_id=9003, name="X", publisher=_publisher())
        qs = Game.objects.all()
        flt = GameFilter()
        out = flt.filter_search(qs, "search", "  \t  ")
        assert list(out) == list(qs)
