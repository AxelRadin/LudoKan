"""
Management command pour vérifier les index créés sur le modèle Game.

Usage:
    python manage.py check_indexes
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Check database indexes created on games_game table"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n=== Database Indexes on games_game Table ===\n"))

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    indexname,
                    indexdef
                FROM pg_indexes
                WHERE tablename = 'games_game'
                ORDER BY indexname;
                """
            )
            indexes = cursor.fetchall()

            if not indexes:
                self.stdout.write(self.style.WARNING("No indexes found on games_game table."))
                return

            for indexname, indexdef in indexes:
                # Highlight our custom indexes
                if "games_" in indexname and "_idx" in indexname:
                    self.stdout.write(self.style.SUCCESS(f"✓ {indexname}"))
                else:
                    self.stdout.write(f"  {indexname}")
                self.stdout.write(f"  {indexdef}\n")

        self.stdout.write(self.style.SUCCESS(f"\nTotal indexes: {len(indexes)}\n"))
