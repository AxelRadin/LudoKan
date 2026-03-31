"""
Enrichissement des noms de jeux IGDB avec les libellés français Wikidata.
Cache en mémoire avec TTL 7 jours (comportement aligné sur l'ancien proxy Express).
"""

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import quote

import requests

from apps.games.igdb_normalizer import normalize_igdb_game

WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
WIKIDATA_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 jours
WIKIDATA_BATCH_CONCURRENCY = 10  # plus de requêtes en parallèle pour réduire le temps total
WIKIDATA_TIMEOUT_SECONDS = 3  # fail fast pour ne pas bloquer la réponse (était 8s)
USER_AGENT = "LudoKan/1.0 (contact: dev@ludokan.local)"

# Cache: name_en -> (value: str | None, expires_at: float)
_wikidata_cache = {}
_cache_lock = None  # pas de lock pour l'instant; en production on pourrait utiliser threading.Lock


def _cache_get(name_en: str):
    entry = _wikidata_cache.get(name_en)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _wikidata_cache[name_en]
        return None
    return value


def _cache_set(name_en: str, value: str | None):
    _wikidata_cache[name_en] = (value, time.time() + WIKIDATA_TTL_SECONDS)


def _escape_sparql_string(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _unique_trimmed_names(names_en: list[str]) -> list[str]:
    return list(dict.fromkeys((n or "").strip() for n in names_en if (n or "").strip()))


def _partition_cache_hits(unique: list[str]) -> tuple[dict[str, str | None], list[str]]:
    """Remplit result avec les entrées trouvées en cache ; retourne les noms à interroger."""
    result: dict[str, str | None] = {}
    to_fetch: list[str] = []
    for n in unique:
        cached = _cache_get(n)
        if cached is not None:
            result[n] = cached if cached else None
        else:
            to_fetch.append(n)
    return result, to_fetch


def _fetch_batch_parallel(batch: list[str], result: dict[str, str | None]) -> None:
    """Exécute fetch_french_label_for_one en parallèle pour un lot et met à jour result + cache."""
    if not batch:
        return
    with ThreadPoolExecutor(max_workers=len(batch)) as executor:
        future_to_name = {executor.submit(fetch_french_label_for_one, name): name for name in batch}
        for future in as_completed(future_to_name):
            name = future_to_name[future]
            try:
                fr = future.result()
            except Exception:
                fr = None
            result[name] = fr
            if fr is not None:
                _cache_set(name, fr)


def fetch_french_label_for_one(name_en: str) -> str | None:
    """Récupère le libellé français Wikidata pour un nom anglais (SPARQL)."""
    if not name_en or not name_en.strip():
        return None
    escaped = _escape_sparql_string(name_en.strip())
    sparql = f"""
SELECT ?frLabel WHERE {{
  ?item rdfs:label "{escaped}"@en;
        rdfs:label ?frLabel.
  FILTER(LANG(?frLabel) = "fr")
}}
LIMIT 1
""".strip()
    url = f"{WIKIDATA_SPARQL_URL}?format=json&query={quote(sparql)}"
    try:
        resp = requests.get(
            url,
            headers={"Accept": "application/sparql+json", "User-Agent": USER_AGENT},
            timeout=WIKIDATA_TIMEOUT_SECONDS,
        )
        if not resp.ok:
            return None
        data = resp.json()
        bindings = (data or {}).get("results", {}).get("bindings") or []
        if not bindings:
            return None
        fr = bindings[0].get("frLabel", {}).get("value")
        return fr.strip() if isinstance(fr, str) and fr.strip() else None
    except Exception:
        return None


def wikidata_french_labels_by_english_titles(names_en: list[str]) -> dict[str, str | None]:
    """
    Pour une liste de noms anglais, retourne un dict name_en -> name_fr (ou None).
    Utilise le cache et des requêtes parallèles par lots de WIKIDATA_BATCH_CONCURRENCY.
    """
    result, to_fetch = _partition_cache_hits(_unique_trimmed_names(names_en))
    for i in range(0, len(to_fetch), WIKIDATA_BATCH_CONCURRENCY):
        batch = to_fetch[i : i + WIKIDATA_BATCH_CONCURRENCY]
        _fetch_batch_parallel(batch, result)
    return result


def enrich_with_wikidata_display_name(games: list[dict]) -> list[dict]:
    """
    Enrichit une liste de jeux IGDB avec display_name, name_fr, name_en.
    En cas de timeout ou d'erreur Wikidata, retourne les jeux sans enrichissement (name_fr = None).
    """
    if not games:
        return []
    names_en = [str(g.get("name") or "").strip() for g in games]
    try:
        fr_map = wikidata_french_labels_by_english_titles(names_en)
    except Exception:
        fr_map = {}

    out = []
    for g in games:
        name_en = str(g.get("name") or "").strip()
        name_fr = fr_map.get(name_en) if name_en in fr_map else None

        g_updated = {
            **g,
            "display_name": name_fr or name_en,
            "name_fr": name_fr,
            "name_en": name_en,
        }
        out.append(normalize_igdb_game(g_updated))
    return out


def wikidata_french_label_by_english_title_debug(name_en: str) -> str | None:
    """
    Version debug : un seul nom, pour l'endpoint /api/igdb/wikidata-test/.
    """
    return fetch_french_label_for_one(name_en)
