import time
import unicodedata

import requests
from django.core.management.base import BaseCommand

from apps.games.models import Game

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
CHUNK_SIZE = 15
WIKIDATA_USER_AGENT = "LudoKan/1.0 (contact: dev@ludokan.local)"


def normalize(s: str) -> str:
    return unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().strip()


def _sparql_escape_quoted(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def _title_search_variants(title: str) -> set[str]:
    variants = {title}
    cleaned = title.replace("Version", "").replace("Edition", "").replace("  ", " ").strip()
    if cleaned and cleaned != title:
        variants.add(cleaned)
    return variants


def _values_lines_for_chunk(chunk: list[str]) -> list[str]:
    lines: list[str] = []
    for t in chunk:
        for v in _title_search_variants(t):
            safe_v = _sparql_escape_quoted(v)
            safe_t = _sparql_escape_quoted(t)
            lines.append(f'("{safe_v}" "{safe_t}")')
    return lines


def _sparql_french_labels_query(values_lines: list[str]) -> str:
    joined = chr(10).join(values_lines)
    return f"""
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?originalName ?frLabel WHERE {{
  VALUES (?searchName ?originalName) {{
    {joined}
  }}
  ?item wdt:P31 wd:Q7889.
  {{
    ?item rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en")
    FILTER(LCASE(STR(?enLabel)) = LCASE(STR(?searchName)))
  }} UNION {{
    ?item skos:altLabel ?enAlt FILTER(LANG(?enAlt) = "en")
    FILTER(LCASE(STR(?enAlt)) = LCASE(STR(?searchName)))
  }}
  OPTIONAL {{ ?item rdfs:label ?frLabel FILTER(LANG(?frLabel) = "fr") }}
}}
""".strip()


def _wikidata_bindings_for_query(sparql: str) -> list:
    r = requests.get(
        SPARQL_ENDPOINT,
        params={"format": "json", "query": sparql},
        headers={
            "Accept": "application/sparql+json",
            "User-Agent": WIKIDATA_USER_AGENT,
        },
        timeout=15,
    )
    if not r.ok:
        return []
    return r.json().get("results", {}).get("bindings", [])


def _merge_french_bindings(bindings: list, out: dict[str, str | None]) -> None:
    for b in bindings:
        original = b.get("originalName", {}).get("value")
        fr = b.get("frLabel", {}).get("value")
        if original and fr and fr.strip():
            out[original] = fr


def fetch_french_names(names_en: list[str]) -> dict[str, str | None]:
    result: dict[str, str | None] = {n: None for n in names_en}

    for i in range(0, len(names_en), CHUNK_SIZE):
        chunk = names_en[i : i + CHUNK_SIZE]
        sparql = _sparql_french_labels_query(_values_lines_for_chunk(chunk))
        try:
            bindings = _wikidata_bindings_for_query(sparql)
            _merge_french_bindings(bindings, result)
        except Exception:
            pass
        time.sleep(0.5)

    return result


class Command(BaseCommand):
    help = "Populate name_fr for all games using Wikidata"

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Overwrite existing name_fr values",
        )

    def handle(self, *args, **options):
        overwrite = options["overwrite"]

        qs = Game.objects.all() if overwrite else Game.objects.filter(name_fr="")
        games = list(qs.values("id", "name"))

        if not games:
            self.stdout.write("Aucun jeu à traiter.")
            return

        self.stdout.write(f"{len(games)} jeux à traduire...")

        names = [g["name"] for g in games]
        name_to_ids: dict[str, list[int]] = {}
        for g in games:
            name_to_ids.setdefault(g["name"], []).append(g["id"])

        fr_map = fetch_french_names(names)

        updated = 0
        for name_en, name_fr in fr_map.items():
            if name_fr:
                ids = name_to_ids.get(name_en, [])
                Game.objects.filter(id__in=ids).update(name_fr=name_fr)
                updated += len(ids)

        self.stdout.write(self.style.SUCCESS(f"{updated} jeux mis à jour avec un nom français."))
