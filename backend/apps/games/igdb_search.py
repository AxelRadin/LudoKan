"""
Helpers pour la recherche IGDB : normalisation de requête, échappement.
Utilisés par les vues proxy IGDB (search, search-page, franchises).
"""

import unicodedata


def normalize_query(q: str) -> str:
    """Retire les accents (NFD + suppression des caractères combinants)."""
    if not q:
        return ""
    normalized = unicodedata.normalize("NFD", q)
    return "".join(c for c in normalized if unicodedata.category(c) != "Mn").strip()


def escape_igdb_string(s: str) -> str:
    """Échappe backslash et guillemets pour les chaînes dans les requêtes IGDB."""
    if not s:
        return ""
    return s.replace("\\", "\\\\").replace('"', '\\"')
