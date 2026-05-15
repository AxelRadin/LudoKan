import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.games import igdb_client
from apps.games.igdb_normalizer import normalize_igdb_game
from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb

logger = logging.getLogger(__name__)


def _collect_igdb_ids(only_missing, limit):
    qs = Game.objects.filter(igdb_id__isnull=False)
    if only_missing:
        qs = qs.filter(genres__isnull=True).distinct()
    qs = qs.order_by("id")
    if limit and limit > 0:
        qs = qs[:limit]
    return list(qs.values_list("igdb_id", flat=True))


class Command(BaseCommand):
    help = "Backfill genres for games that have none, fetching from IGDB."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Process all games, not just those missing genres.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit the number of games to process.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Fetch data and log intent without saving to the database.",
        )

    def handle(self, *args, **options):
        only_missing = not options["all"]
        limit = options["limit"]
        dry_run = options["dry_run"]

        igdb_ids = _collect_igdb_ids(only_missing, limit)
        total = len(igdb_ids)

        if total == 0:
            self.stdout.write(self.style.SUCCESS("No games to process."))
            return

        label = "all games" if not only_missing else "games missing genres"
        self.stdout.write(f"Processing {total} {label}...")

        chunk_size = 50
        processed = success = errors = 0

        for i in range(0, total, chunk_size):
            chunk = igdb_ids[i : i + chunk_size]
            try:
                p, s, e = self._process_chunk(chunk, dry_run)
                processed += p
                success += s
                errors += e
            except Exception as exc:
                logger.exception(f"Chunk {i}-{i + chunk_size} failed: {exc}")
                self.stdout.write(self.style.ERROR(f"Chunk error: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone. Processed: {processed}, Updated: {success}, Errors: {errors}"))

    def _process_chunk(self, chunk, dry_run):
        ids_str = ",".join(map(str, chunk))
        query = f"fields id,genres.id,genres.name; where id = ({ids_str}); limit {len(chunk)};"
        raw = igdb_client.igdb_request("games", query)

        if not isinstance(raw, list):
            self.stdout.write(self.style.ERROR(f"Unexpected IGDB response: {type(raw)}"))
            return (0, 0, 0)

        p = s = e = 0
        for igdb_game in raw:
            dp, ds, de = self._apply(igdb_game, dry_run)
            p += dp
            s += ds
            e += de
        return (p, s, e)

    def _apply(self, igdb_game, dry_run):
        igdb_id = igdb_game.get("id")
        if not igdb_id:
            return (0, 0, 0)

        norm = normalize_igdb_game(igdb_game)
        genres = norm.get("genres")

        if not genres:
            self.stdout.write(f"  IGDB {igdb_id}: no genres returned, skipping.")
            return (1, 0, 0)

        if dry_run:
            names = ", ".join(g["name"] for g in genres)
            self.stdout.write(self.style.SUCCESS(f"  [DRY-RUN] IGDB {igdb_id}: would set genres [{names}]"))
            return (1, 1, 0)

        try:
            with transaction.atomic():
                get_or_create_game_from_igdb(igdb_id=igdb_id, genres=genres)
            self.stdout.write(self.style.SUCCESS(f"  IGDB {igdb_id}: genres updated."))
            return (1, 1, 0)
        except Exception as exc:
            logger.exception(f"Failed for IGDB {igdb_id}: {exc}")
            self.stdout.write(self.style.ERROR(f"  IGDB {igdb_id}: error — {exc}"))
            return (1, 0, 1)
