"""
Management command pour tester les performances des requêtes avec EXPLAIN.

Usage:
    python manage.py test_query_performance
"""

from django.core.management.base import BaseCommand
from django.db import connection

from apps.games.models import Game


class Command(BaseCommand):
    help = "Test query performance with EXPLAIN to validate index usage"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n=== Testing Query Performance with EXPLAIN ===\n"))

        # Test 1: Filter by min_age
        self.stdout.write(self.style.WARNING("\n1. Query: Filter by min_age >= 12"))
        self._test_query(
            Game.objects.filter(min_age__gte=12).select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")
        )

        # Test 2: Filter by min_players
        self.stdout.write(self.style.WARNING("\n2. Query: Filter by min_players <= 2"))
        self._test_query(
            Game.objects.filter(min_players__lte=2).select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")
        )

        # Test 3: Filter by max_players
        self.stdout.write(self.style.WARNING("\n3. Query: Filter by max_players >= 4"))
        self._test_query(
            Game.objects.filter(max_players__gte=4).select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")
        )

        # Test 4: Combined filters (min_age + min_players) - should use composite index
        self.stdout.write(self.style.WARNING("\n4. Query: Combined min_age >= 12 AND min_players <= 2"))
        self._test_query(
            Game.objects.filter(min_age__gte=12, min_players__lte=2)
            .select_related("publisher")
            .prefetch_related("genres", "platforms")
            .order_by("-popularity_score")
        )

        # Test 5: Filter with M2M (genres) + numeric filter
        self.stdout.write(self.style.WARNING("\n5. Query: Filter by genre ID 1 AND min_age >= 12"))
        self._test_query(
            Game.objects.filter(genres__id=1, min_age__gte=12)
            .select_related("publisher")
            .prefetch_related("genres", "platforms")
            .distinct()
            .order_by("-popularity_score")
        )

        # Test 6: Order by popularity_score only
        self.stdout.write(self.style.WARNING("\n6. Query: Order by -popularity_score (no filter)"))
        self._test_query(Game.objects.select_related("publisher").prefetch_related("genres", "platforms").order_by("-popularity_score")[:20])

        self.stdout.write(self.style.SUCCESS("\n\n=== Performance Testing Complete ===\n"))
        self.stdout.write("Look for 'Index Scan' or 'Index Only Scan' in the EXPLAIN output to confirm index usage.\n")
        self.stdout.write("'Seq Scan' indicates a full table scan (slower for large tables).\n")

    def _test_query(self, queryset):
        """Execute a query with EXPLAIN and display the plan."""
        sql, params = queryset.query.sql_with_params()

        with connection.cursor() as cursor:
            # EXPLAIN ANALYZE for PostgreSQL (shows actual execution)
            cursor.execute(f"EXPLAIN {sql}", params)
            explain_output = cursor.fetchall()

            self.stdout.write("SQL Query:")
            self.stdout.write(self.style.SQL_KEYWORD(sql[:200] + "..." if len(sql) > 200 else sql))
            self.stdout.write("\nQuery Plan:")

            for row in explain_output:
                line = row[0]
                # Highlight index usage
                if "Index Scan" in line or "Index Only Scan" in line:
                    self.stdout.write(self.style.SUCCESS(f"  ✓ {line}"))
                elif "Seq Scan" in line:
                    self.stdout.write(self.style.WARNING(f"  ⚠ {line}"))
                else:
                    self.stdout.write(f"  {line}")

        # Count results
        count = queryset.count()
        self.stdout.write(f"\nResults: {count} games found\n")
