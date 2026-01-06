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

