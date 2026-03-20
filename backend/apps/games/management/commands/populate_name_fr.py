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


def fetch_french_names(names_en: list[str]) -> dict[str, str | None]:
    result: dict[str, str | None] = {n: None for n in names_en}

    for i in range(0, len(names_en), CHUNK_SIZE):
        chunk = names_en[i : i + CHUNK_SIZE]

        values_lines = []
        for t in chunk:
            variants = {t}
            cleaned = t.replace("Version", "").replace("Edition", "").replace("  ", " ").strip()
            if cleaned and cleaned != t:
                variants.add(cleaned)
            for v in variants:
                safe = v.replace("\\", "\\\\").replace('"', '\\"')
                safe_t = t.replace("\\", "\\\\").replace('"', '\\"')
                values_lines.append(f'("{safe}" "{safe_t}")')

        sparql = f"""
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?originalName ?frLabel WHERE {{
  VALUES (?searchName ?originalName) {{
    {chr(10).join(values_lines)}
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

        try:
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
                continue

            bindings = r.json().get("results", {}).get("bindings", [])
            for b in bindings:
                original = b.get("originalName", {}).get("value")
                fr = b.get("frLabel", {}).get("value")
                if original and fr and fr.strip():
                    result[original] = fr

        except Exception:
            pass

        time.sleep(0.5)  # respect Wikidata rate limits

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
