import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.games import igdb_client
from apps.games.igdb_normalizer import normalize_igdb_game
from apps.games.models import Game
from apps.games.services import get_or_create_game_from_igdb

logger = logging.getLogger(__name__)


def _collect_igdb_ids(game_id, igdb_id_param, limit):
    """Return list of IGDB ids to backfill (games must have igdb_id set)."""
    qs = Game.objects.filter(igdb_id__isnull=False)

    if game_id:
        qs = qs.filter(id=game_id)
    if igdb_id_param:
        qs = qs.filter(igdb_id=igdb_id_param)

    if not game_id and not igdb_id_param:
        qs = qs.order_by("-popularity_score", "id")

    if limit and limit > 0:
        qs = qs[:limit]

    return list(qs.values_list("igdb_id", flat=True))


class Command(BaseCommand):
    help = "Backfill game media (screenshots, videos) for games already in local database from IGDB."

    def add_arguments(self, parser):
        parser.add_argument(
            "--game-id",
            type=int,
            help="Target a specific local game by its database ID.",
        )
        parser.add_argument(
            "--igdb-id",
            type=int,
            help="Target a specific game by its IGDB ID.",
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
        game_id = options["game_id"]
        igdb_id_param = options["igdb_id"]
        limit = options["limit"]
        dry_run = options["dry_run"]

        igdb_ids = _collect_igdb_ids(game_id, igdb_id_param, limit)
        total_games = len(igdb_ids)

        if total_games == 0:
            self.stdout.write(self.style.WARNING("No games found matching criteria."))
            return

        self.stdout.write(f"Preparing to process {total_games} games...")

        chunk_size = 50
        processed_count = 0
        success_count = 0
        error_count = 0

        for i in range(0, total_games, chunk_size):
            chunk = set(igdb_ids[i : i + chunk_size])
            try:
                dp, ds, de = self._process_igdb_chunk(chunk, dry_run)
                processed_count += dp
                success_count += ds
                error_count += de
            except Exception as e:
                logger.exception(f"Failed to query IGDB for chunk {i}-{i+chunk_size}: {e}")
                self.stdout.write(self.style.ERROR(f"Chunk error: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\nFinished backfill. Processed: {processed_count}, Success: {success_count}, Errors: {error_count}"))

    def _process_igdb_chunk(self, chunk, dry_run):
        """Fetch one IGDB chunk and apply updates. Returns (processed, success, error) deltas."""
        chunk_list_str = ",".join(map(str, chunk))
        query = f"fields name,screenshots.url,videos.video_id,videos.name; " f"where id = ({chunk_list_str}); limit {len(chunk)};"
        igdb_raw_data = igdb_client.igdb_request("games", query)

        if not isinstance(igdb_raw_data, list):
            self.stdout.write(self.style.ERROR(f"Expected list from IGDB, got {type(igdb_raw_data)}"))
            return (0, 0, 0)

        processed = success = errors = 0
        for igdb_game in igdb_raw_data:
            p, s, e = self._apply_one_igdb_game(igdb_game, dry_run)
            processed += p
            success += s
            errors += e
        return (processed, success, errors)

    def _apply_one_igdb_game(self, igdb_game, dry_run):
        """Returns (processed_delta, success_delta, error_delta)."""
        current_igdb_id = igdb_game.get("id")
        if not current_igdb_id:
            return (0, 0, 0)

        norm = normalize_igdb_game(igdb_game)
        screenshots = norm.get("screenshots")
        videos = norm.get("videos")

        if not screenshots and not videos:
            self.stdout.write(f"Ignoring IGDB ID {current_igdb_id} (No media found)")
            return (1, 0, 0)

        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[DRY-RUN] Target IGDB ID {current_igdb_id}: " f"Found {len(screenshots or [])} screens, {len(videos or [])} videos."
                )
            )
            return (1, 1, 0)

        return self._persist_game_media(current_igdb_id, screenshots, videos)

    def _persist_game_media(self, current_igdb_id, screenshots, videos):
        try:
            with transaction.atomic():
                get_or_create_game_from_igdb(igdb_id=current_igdb_id, screenshots=screenshots, videos=videos)
            self.stdout.write(self.style.SUCCESS(f"Successfully synced media for IGDB ID {current_igdb_id}"))
            return (1, 1, 0)
        except Exception as e:
            logger.exception(f"Failed to sync IGDB ID {current_igdb_id}: {e}")
            self.stdout.write(self.style.ERROR(f"Error for IGDB ID {current_igdb_id}: {e}"))
            return (1, 0, 1)
