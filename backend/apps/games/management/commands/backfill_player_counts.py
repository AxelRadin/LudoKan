import time

from django.core.management.base import BaseCommand

from apps.games import igdb_client
from apps.games.igdb_wikidata import enrich_with_wikidata_display_name
from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb


class Command(BaseCommand):
    help = "Backfill min_players/max_players for games missing player count data."

    def add_arguments(self, parser):
        parser.add_argument("--batch", type=int, default=10, help="Games per IGDB request (max 10)")
        parser.add_argument("--delay", type=float, default=0.25, help="Delay in seconds between requests")
        parser.add_argument("--limit", type=int, default=None, help="Max games to process")

    def handle(self, *args, **options):
        batch_size = min(options["batch"], 10)
        delay = options["delay"]
        limit = options["limit"]

        qs = Game.objects.filter(max_players__isnull=True, igdb_id__isnull=False).values_list("igdb_id", flat=True)
        if limit:
            qs = qs[:limit]

        igdb_ids = list(qs)
        total = len(igdb_ids)
        self.stdout.write(f"Found {total} games without player count data.")

        updated = 0
        skipped = 0

        for i in range(0, total, batch_size):
            batch = igdb_ids[i : i + batch_size]
            ids_str = ",".join(str(x) for x in batch)
            query = (
                "fields name,game_modes.name,"
                "multiplayer_modes.onlinemax,multiplayer_modes.offlinemax,"
                "multiplayer_modes.onlinecoopmax,multiplayer_modes.offlinecoopmax;"
                f"where id = ({ids_str}); limit {batch_size};"
            )

            try:
                data = igdb_client.igdb_request("games", query)
                enriched = enrich_with_wikidata_display_name(data)
                for norm in enriched:
                    if norm.get("min_players") is None and norm.get("max_players") is None:
                        skipped += 1
                        continue
                    get_or_create_game_from_igdb(
                        igdb_id=norm["igdb_id"],
                        min_players=norm.get("min_players"),
                        max_players=norm.get("max_players"),
                    )
                    updated += 1
            except Exception as e:
                self.stderr.write(f"Error on batch {batch}: {e}")

            self.stdout.write(f"  {min(i + batch_size, total)}/{total}...")
            time.sleep(delay)

        self.stdout.write(self.style.SUCCESS(f"Done. Updated: {updated}, no IGDB data: {skipped}."))
