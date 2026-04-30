# API Documentation

## Django-filter Configuration

### Overview

The API uses `django-filter` to enable filtering on Django REST Framework endpoints.

### Installation

```bash
pip install django-filter
```

### Configuration

1. **Add to `INSTALLED_APPS`** in `config/settings.py`:

```python
INSTALLED_APPS = [
    # ...
    "django_filters",
    # ...
]
```

2. **Configure DRF filter backends** in `REST_FRAMEWORK` settings:

```python
REST_FRAMEWORK = {
    # ...
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    # ...
}
```

3. **Enable filtering on viewsets**:

```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class GameViewSet(ModelViewSet):
    queryset = Game.objects.all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["name"]  # Simple field filtering
    ordering_fields = ["release_date", "rating_avg"]
```

### Usage Examples

#### Filter games by name

```bash
# Exact match filter
GET /api/games/?name=zelda

# Returns all games with exact name "zelda"
```

#### Combine filters

```bash
# Multiple filters can be combined
GET /api/games/?name=zelda&publisher=Nintendo
```

#### Testing with curl

```bash
# Test the filter endpoint
curl -X GET "http://localhost:8000/api/games/?name=zelda" \
  -H "Accept: application/json"
```

### Available Filters

#### Games Endpoint (`/api/games/`)

The API supports filtering games by **genres** and **platforms** using Many-to-Many relationships. Multiple values can be provided for each filter.

##### Filter Parameters

- **`genre`**: Filter by genre ID(s) - supports multiple values separated by commas
- **`platform`**: Filter by platform ID(s) - supports multiple values separated by commas

##### Usage Examples

**Filter by single genre:**
```bash
GET /api/games/?genre=1
# Returns all games that have genre with ID 1
```

**Filter by multiple genres (OR condition):**
```bash
GET /api/games/?genre=1,2,3
# Returns all games that have genre 1 OR 2 OR 3
```

**Filter by single platform:**
```bash
GET /api/games/?platform=4
# Returns all games available on platform with ID 4
```

**Filter by multiple platforms (OR condition):**
```bash
GET /api/games/?platform=4,5
# Returns all games available on platform 4 OR 5
```

**Combine genre and platform filters (AND condition):**
```bash
GET /api/games/?genre=1&platform=2
# Returns all games that have genre 1 AND are available on platform 2
```

**Complex filtering example:**
```bash
GET /api/games/?genre=1,2&platform=3,4,5
# Returns all games that:
# - Have genre 1 OR 2
# - AND are available on platform 3, 4 OR 5
```

##### Testing with curl

```bash
# Filter by genre
curl -X GET "http://localhost:8000/api/games/?genre=1" \
  -H "Accept: application/json"

# Filter by multiple genres
curl -X GET "http://localhost:8000/api/games/?genre=1,2,3" \
  -H "Accept: application/json"

# Filter by platform
curl -X GET "http://localhost:8000/api/games/?platform=2" \
  -H "Accept: application/json"

# Combine filters
curl -X GET "http://localhost:8000/api/games/?genre=1&platform=2" \
  -H "Accept: application/json"
```

##### Testing with Postman

1. Create a new GET request to `http://localhost:8000/api/games/`
2. Go to the "Params" tab
3. Add query parameters:
   - Key: `genre`, Value: `1,2,3`
   - Key: `platform`, Value: `4,5`
4. Send the request

### Advanced Filtering Implementation

The filtering is implemented using a custom `FilterSet` class in `apps/games/filters.py`:

```python
import django_filters
from apps.games.models import Game

class GameFilter(django_filters.FilterSet):
    # BaseInFilter allows multiple values separated by commas
    genre = django_filters.BaseInFilter(
        field_name='genres__id',
        lookup_expr='in'
    )

    platform = django_filters.BaseInFilter(
        field_name='platforms__id',
        lookup_expr='in'
    )

    class Meta:
        model = Game
        fields = ['genre', 'platform']
```

The `GameViewSet` uses this filter and includes `.distinct()` to avoid duplicate results from Many-to-Many joins:

```python
class GameViewSet(ModelViewSet):
    queryset = (
        Game.objects.select_related("publisher")
        .prefetch_related("genres", "platforms")
        .order_by("-popularity_score")
        .distinct()  # Avoid duplicates from M2M filtering
    )
    filterset_class = GameFilter
```

---

## Numeric Filters (min_age, min_players, max_players)

In addition to Many-to-Many filters, the `GameFilter` also supports numeric comparison filters on three integer fields of the `Game` model.

### Available parameters

| Parameter | Field | Operator | Description |
|-----------|-------|----------|-------------|
| `min_age` | `min_age` | `gte` | Returns games where minimum required age ≥ value |
| `min_players` | `min_players` | `lte` | Returns games where minimum player count ≤ value (playable with N players) |
| `max_players` | `max_players` | `gte` | Returns games where maximum player count ≥ value (supports N players) |

### Business logic

- **`min_age=12`** → games requiring age 12 or older (`min_age >= 12`)
- **`min_players=2`** → games playable with 2 players: includes solo games (min=1) and 2-player games (min=2), excludes games requiring 3+ players
- **`max_players=4`** → games that support groups of 4: excludes solo (max=1) and 2-3 player games

### Usage examples

```
# Jeux pour 12 ans et +
GET /api/games/?min_age=12

# Jeux jouables à 2 joueurs (minimum requis ≤ 2)
GET /api/games/?min_players=2

# Jeux acceptant au moins 4 joueurs (maximum ≥ 4)
GET /api/games/?max_players=4

# Combinaison : jeux pour 12 ans et + jouables à 2 (ticket critère d'acceptation)
GET /api/games/?min_age=12&min_players=2

# Combinaison avec filtres M2M : genre Action, pour 12 ans+, jouables à 2
GET /api/games/?genre=1&min_age=12&min_players=2
```

### curl examples

```bash
# Filtrer par âge minimum
curl "http://localhost:8000/api/games/?min_age=12"

# Filtrer par nombre de joueurs
curl "http://localhost:8000/api/games/?min_players=2&max_players=6"

# Combinaison complète
curl "http://localhost:8000/api/games/?min_age=12&min_players=2&genre=1,2"
```

### Notes

- Games with `null` values for these fields are excluded when the corresponding filter is applied.
- All numeric filters combine with AND logic (a game must satisfy all active filters).
- Numeric filters combine with genre/platform filters as AND (e.g. `?genre=1&min_age=12` returns games that have genre 1 AND min_age ≥ 12).

---

# Ratings API Guide

## Endpoints overview

### Create or update a rating for a game

- **Method**: `POST`
- **URL**: `/api/games/{game_id}/ratings/`
- **Auth**: authenticated user required (JWT cookies or Authorization header)
- **Body (JSON)**:

```json
{
  "rating_type": "etoiles",
  "value": 4.5
}
```

- **Accepted `rating_type` values**:
  - `"sur_100"`: integer or decimal between 0 and 100 (e.g. `87`)
  - `"sur_10"`: integer or decimal between 0 and 10 (e.g. `9`)
  - `"decimal"`: integer or decimal between 0 and 10 (e.g. `7`, `7.5`, `7.25`)
  - `"etoiles"`: integer or decimal between 1 and 5 (e.g. `4`, `4.5`)

- **Responses**:
  - `201 Created` if the user creates a new rating for this game
  - `200 OK` if the user already rated this game and the rating was updated (upsert)
  - `400 Bad Request` if the payload is invalid (wrong type, value out of range, etc.)
  - `401/403` if the user is not authenticated or not allowed

- **Example response**:

```json
{
  "id": 3,
  "game": 42,
  "user": 7,
  "rating_type": "etoiles",
  "value": "4.5"
}
```

---

### Retrieve / update / delete a single rating

- **Method**: `GET | PATCH | DELETE`
- **URL**: `/api/ratings/{rating_id}/`
- **Auth**: authenticated user required.
- **Ownership rule**: only the owner of the rating can access/update/delete it.
  - If a rating exists but does not belong to the current user, the API returns `404`.

#### GET `/api/ratings/{rating_id}/`

- Returns the rating data for the current user:

```json
{
  "id": 3,
  "game": 42,
  "user": 7,
  "rating_type": "sur_10",
  "value": "9.0"
}
```

#### PATCH `/api/ratings/{rating_id}/`

- Body (example):

```json
{
  "rating_type": "sur_10",
  "value": 8
}
```

- Responses:
  - `200 OK` with the updated rating
  - `400 Bad Request` on invalid payload
  - `404 Not Found` if the rating does not exist or does not belong to the user

#### DELETE `/api/ratings/{rating_id}/`

- Responses:
  - `204 No Content` on successful deletion
  - `404 Not Found` if the rating does not exist or does not belong to the user

---

### List ratings (optional filters)

- **Method**: `GET`
- **URL**: `/api/ratings/`
- **Query params**:
  - `user_id` (optional): filter by user
  - `game_id` (optional): filter by game

Examples:

- All ratings for game `42`:

  - `GET /api/ratings/?game_id=42`

- All ratings created by user `7`:

  - `GET /api/ratings/?user_id=7`

- The rating given by user `7` for game `42`:

  - `GET /api/ratings/?user_id=7&game_id=42`

---

## Average rating and rating count on games

Each `Game` object exposes:

- `average_rating`: average rating on a 0–10 scale
- `rating_count`: number of ratings for this game

Example response from `GET /api/games/{id}/`:

```json
{
  "id": 42,
  "name": "Test Game",
  "average_rating": 8.5,
  "rating_count": 2,
  "rating_avg": 8.5,
  "popularity_score": 0.0,
  "publisher": { ... },
  "genres": [ ... ],
  "platforms": [ ... ]
}
```

### How the average is computed

Internally, all ratings are normalized to a 0–10 scale using this logic:

- `sur_100`: `normalized = value / 10` (e.g. 90 -> 9.0)
- `sur_10`: `normalized = value` (unchanged)
- `decimal`: `normalized = value` (unchanged)
- `etoiles`: `normalized = value * 2` (1–5 stars -> 2–10)

For each game:

- `average_rating` is the average of all `normalized` values
- `rating_count` is the number of ratings
- `rating_avg` (legacy field) is kept in sync with `average_rating`

These values are automatically updated on **every** rating `POST`, `PATCH` et `DELETE`.

---

## Game stats (`GET /api/games/{game_id}/stats/`)

Returns aggregated stats for a game (owners, ratings, reviews). For the ratings UI, the relevant part is the `ratings` object:

| Field | Type | Description |
| --- | --- | --- |
| `average` | number | Same scale as `average_rating` on the game (0–10, mixed rating types normalized). |
| `count` | integer | Total number of ratings (`rating_count`). |
| `distribution` | object | Counts all **`Rating`** rows of type `etoiles` (1–5 stars) for the game. Aligns with `rating_count` for star votes. `GET /api/reviews/?game=` also returns **rating-only** rows (same star) as synthetic entries with `rating_only: true`. |

Example (excerpt):

```json
{
  "game_id": 42,
  "ratings": {
    "average": 8.2,
    "count": 134,
    "distribution": { "1": 2, "2": 5, "3": 20, "4": 60, "5": 47 }
  }
}
```

---

## Frontend integration guide

### Basic flow to display ratings for a game

1. Fetch the game details:

   - `GET /api/games/{game_id}/`
   - Read `average_rating` and `rating_count` from the response.

2. Optionally, fetch the current user's rating for the game:

   - `GET /api/ratings/?user_id={current_user_id}&game_id={game_id}`
   - If the `results` list is not empty, use the first element as the user's rating.

### Creating or updating a rating from the UI

1. The user selects a rating value and type (`sur_10`, `etoiles`, etc.).
2. Send a POST request:

```http
POST /api/games/{game_id}/ratings/
Content-Type: application/json

{
  "rating_type": "etoiles",
  "value": 4.5
}
```

3. On success (201 or 200):

   - Optionally refresh the game details (`GET /api/games/{game_id}/`) to get the new
     `average_rating` and `rating_count`.
   - Optionally refresh the user's rating via `GET /api/ratings/?user_id=...&game_id=...`.

### Handling errors in the frontend

- If the API returns **400**, display the error message contained in the response body
  (e.g. "Rating out of range for type 'sur_10' (0–10)").
- If the API returns **401/403**, redirect the user to login or show an authorization error.
- If the API returns **404** on `/api/ratings/{rating_id}/`, the rating either does not
  exist or does not belong to the current user.

---

This file is a high-level guide; for full schema details, refer to the Swagger UI
exposed at the root URL (served by drf-spectacular).

