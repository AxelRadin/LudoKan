"""Tests unitaires pour apps.games.igdb_search."""

from apps.games.igdb_search import escape_igdb_string, normalize_query


def test_normalize_query_empty_returns_empty():
    """Ligne 12 : entrée vide → chaîne vide."""
    assert normalize_query("") == ""


def test_normalize_query_strips_accents():
    assert normalize_query("café") == "cafe"
    assert normalize_query("Élève") == "Eleve"


def test_escape_igdb_string_falsy_returns_empty():
    """Ligne 20 : chaîne vide → chaîne vide."""
    assert escape_igdb_string("") == ""


def test_escape_igdb_string_escapes_backslash_and_quotes():
    assert escape_igdb_string('say "hi"') == 'say \\"hi\\"'
    assert escape_igdb_string("a\\b") == "a\\\\b"
