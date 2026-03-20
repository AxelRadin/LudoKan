"""Tests unitaires des helpers de views_igdb (sans requêtes HTTP)."""

import pytest
from django.core.exceptions import ImproperlyConfigured

from apps.games.views_igdb import (
    _clamp_limit,
    _clamp_limit_200,
    _clamp_offset,
    _is_igdb_unavailable,
    _remove_q_equals_artifact,
    _split_sentences_for_translate,
)


def test_split_sentences_splits_on_punctuation():
    """Les segments incluent les espaces après la ponctuation (l. 63)."""
    assert _split_sentences_for_translate("Hello. World! Yes?") == [
        "Hello. ",
        "World! ",
        "Yes?",
    ]


def test_split_sentences_no_punctuation_returns_whole():
    assert _split_sentences_for_translate("no punct here") == ["no punct here"]


def test_split_sentences_strips_empty_segments():
    """Si tout est vide après strip, retourne [text] original."""
    assert _split_sentences_for_translate("   ") == ["   "]


def test_remove_q_equals_artifact_start_of_string():
    assert _remove_q_equals_artifact("q=foo") == "foo"


def test_remove_q_equals_artifact_after_space():
    assert _remove_q_equals_artifact("hi q=bar") == "hi bar"


def test_remove_q_equals_not_removed_if_space_after_equals():
    """q= suivi d'un espace : pas de suppression (l. 83)."""
    assert _remove_q_equals_artifact("q= foo") == "q= foo"


def test_clamp_limit_defaults_and_bounds():
    assert _clamp_limit(None) == 1
    assert _clamp_limit("5") == 5
    assert _clamp_limit(100, max_val=50) == 50
    assert _clamp_limit(0) == 1


def test_clamp_limit_200():
    assert _clamp_limit_200(None) == 1
    assert _clamp_limit_200(300, max_val=200) == 200


def test_clamp_offset():
    assert _clamp_offset(None) == 0
    assert _clamp_offset("-3") == 0
    assert _clamp_offset(10) == 10


@pytest.mark.parametrize(
    "exc,expected",
    [
        (ImproperlyConfigured("x"), True),
        (RuntimeError("IGDB error 401 on games"), True),
        (RuntimeError("authorization failure"), True),
        (RuntimeError("random"), False),
    ],
)
def test_is_igdb_unavailable(exc, expected):
    assert _is_igdb_unavailable(exc) is expected
