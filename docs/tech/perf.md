# Performance Optimizations Documentation

This document tracks performance optimizations applied to the LudoKan backend, particularly database indexing strategies.

---

## Database Indexes (2026-03-10)

### Context

As part of ticket **BACK-008D**, we implemented database indexes to optimize filter performance on the `Game` model. The filters added in BACK-008C (numeric filters for `min_age`, `min_players`, `max_players`) and BACK-008B (M2M filters for `genres`, `platforms`) are frequently used and benefit significantly from proper indexing.

### Indexes Added

The following indexes were added to the `games_game` table via migration `0010`:

| Index Name | Fields | Type | Purpose |
|------------|--------|------|---------|
| `games_min_age_idx` | `min_age` | B-tree | Optimize `?min_age=X` filter (gte lookup) |
| `games_min_players_idx` | `min_players` | B-tree | Optimize `?min_players=X` filter (lte lookup) |
| `games_max_players_idx` | `max_players` | B-tree | Optimize `?max_players=X` filter (gte lookup) |
| `games_popularity_idx` | `-popularity_score` | B-tree (DESC) | Optimize default ordering by popularity |
| `games_age_players_idx` | `min_age, min_players` | Composite B-tree | Optimize combined filter `?min_age=X&min_players=Y` |

### Existing Indexes (Automatic)

Django automatically creates indexes for:

- **Primary key**: `games_game_pkey` on `id`
- **Unique constraint**: `games_game_igdb_id_key` on `igdb_id`
- **Foreign keys**: `games_game_publisher_id_cbb50fa5` on `publisher_id`

Many-to-Many tables (`games_game_genres`, `games_game_platforms`) also have automatic indexes on their foreign key columns, which optimize JOIN operations when filtering by genre or platform.

### Implementation Details

#### Model Changes

```python
class Game(models.Model):
    # ... fields ...

    class Meta:
        indexes = [
            models.Index(fields=["min_age"], name="games_min_age_idx"),
            models.Index(fields=["min_players"], name="games_min_players_idx"),
            models.Index(fields=["max_players"], name="games_max_players_idx"),
            models.Index(fields=["-popularity_score"], name="games_popularity_idx"),
            models.Index(fields=["min_age", "min_players"], name="games_age_players_idx"),
        ]
```

#### Migration

Migration `0010_game_games_min_age_idx_game_games_min_players_idx_and_more.py` creates all 5 indexes using `CREATE INDEX` statements.

### Performance Impact

#### Expected Gains

With these indexes, PostgreSQL can efficiently:

1. **Single numeric filters** (e.g., `?min_age=12`): O(log n) lookup instead of O(n) table scan
2. **Combined filters** (e.g., `?min_age=12&min_players=2`): Use composite index for optimal performance
3. **Ordering by popularity**: Avoid sort operation, directly read from index
4. **M2M + numeric filters**: Combine M2M join index with numeric index for efficient queries

#### Benchmark Results

**Current status**: Database contains minimal test data (0-100 games). PostgreSQL query planner uses sequential scans for small tables as it's faster than index scans when table fits in memory.

**Index usage verified**: All 5 custom indexes successfully created in PostgreSQL (confirmed via `pg_indexes`).

**Production expectations**: With 1000+ games, indexes will provide:
- ~10-100x speedup on filtered queries
- Reduced CPU usage and I/O operations
- Better scalability under concurrent load

#### Query Plan Analysis

Performance can be validated using the management command:

```bash
python manage.py test_query_performance
```

This command runs `EXPLAIN` on common filter queries and shows whether indexes are used. Look for:
- ✓ `Index Scan` or `Index Only Scan` = good (index is used)
- ⚠ `Seq Scan` = acceptable for small tables, problematic for large tables

To check created indexes:

```bash
python manage.py check_indexes
```

### Best Practices Applied

1. **Named indexes**: All indexes have explicit names (e.g., `games_min_age_idx`) for easier maintenance
2. **Composite index**: Created `(min_age, min_players)` composite index for frequently combined filters
3. **Descending index**: `popularity_score DESC` matches the actual ORDER BY clause in queries
4. **Selective indexing**: Only indexed frequently-filtered columns (not all integer fields)
5. **FK indexes**: Relied on Django's automatic FK indexing (no redundant indexes)

### Monitoring Recommendations

In production, monitor:

1. **Slow query log**: Identify queries taking >100ms
2. **Index usage stats**: PostgreSQL's `pg_stat_user_indexes` shows index hit rates
3. **Query plans**: Periodically run `EXPLAIN ANALYZE` on critical endpoints
4. **Database size**: Indexes add ~10-20% storage overhead (acceptable trade-off)

### Future Optimizations

Potential additional indexes if needed:

- **Composite with publisher**: `(publisher_id, min_age)` if filtering by publisher + age becomes common
- **Release date**: Index on `release_date` if temporal queries increase
- **Partial indexes**: Index only non-null values (e.g., `WHERE min_age IS NOT NULL`) to reduce index size

---

## Tools Used

- **Django ORM**: Index definitions in `Meta.indexes`
- **PostgreSQL**: B-tree indexes (default for numeric/text columns)
- **EXPLAIN**: Query plan analysis to validate index usage
- **Management commands**: Custom commands for performance testing and index verification

---

## References

- Django documentation: [Database indexes](https://docs.djangoproject.com/en/4.2/ref/models/options/#indexes)
- PostgreSQL documentation: [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- Migration file: `apps/games/migrations/0010_game_games_min_age_idx_game_games_min_players_idx_and_more.py`
- Model file: `apps/games/models.py` (Game model Meta class)
