# Game Resolution and Persistence Architecture

This document outlines the architecture and business rules for game data management in LudoKan, focusing on the interface between the frontend and the backend (Django + IGDB).

---

## 1. The `NormalizedGame` Data Contract

The `NormalizedGame` structure is the unified format used across the entire application. Whether a game is fetched from the internal database or directly from IGDB, it always adheres to this contract.

### Data Structure

| Field | Type | Description |
| :--- | :--- | :--- |
| `igdb_id` | `number` | **Canonical ID.** Required. The unique identifier from IGDB. |
| `django_id` | `number \| null` | **Internal ID.** The database primary key in Django. `null` if the game hasn't been persisted yet. |
| `name` | `string` | The unified game name. |
| `summary` | `string \| null` | Game description. |
| `cover_url` | `string \| null` | URL for the game's cover image. |
| `release_date` | `string \| null` | Formatted as `YYYY-MM-DD`. |
| `platforms` | `BasePlatform[]` | List of available platforms. |
| `genres` | `BaseGenre[]` | List of categories. |
| `user_library` | `UserLibraryData \| null` | Current user's library status (`status`, `is_favorite`). |
| `user_rating` | `UserRatingData \| null` | Current user's personal score (`value`, `rating_type`). |

### Example JSON Response

```json
{
  "igdb_id": 1020,
  "django_id": 42,
  "name": "Grand Theft Auto V",
  "summary": "GTA V is an open-world action-adventure game...",
  "cover_url": "https://images.igdb.com/t_cover_big/co5v7e.jpg",
  "release_date": "2013-09-17",
  "platforms": [{ "id": 6, "name": "PC" }],
  "genres": [{ "id": 5, "name": "Shooter" }],
  "user_library": {
    "status": "TERMINE",
    "is_favorite": true
  },
  "user_rating": {
    "value": 9.5,
    "rating_type": "sur_10"
  }
}
```

---

## 2. API Endpoints & Responsibilities

Endpoints are categorized by their impact on data persistence.

### A. Endpoints de Lecture (Read-Only)
**Rule:** Simple consultation must **NEVER** create a `Game` or `UserGame` in the database.

*   `GET /api/games/<django_id>/`: Fetches an existing game from the internal database.
*   `GET /api/games/igdb/<igdb_id>/`: Fetches a game using its IGDB ID. If the game is missing from the local database, it proxies to IGDB but **does not save it**.

### B. Route de Résolution (Resolution)
*   `POST /api/games/resolve-from-igdb/`: Converts an IGDB game into a Django-persisted game.
    *   **Idempotent:** If the game already exists, it simply returns its `django_id`.
    *   **Required for Actions:** Any persistent action (rating, review, library add) must ensure the game is resolved first.

### C. Endpoints d'Action Métier (Business Actions)
**Rule:** These routes always expect a `django_id`.

*   `PATCH /api/me/games/<django_id>/`: Updates library status (favorite, status).
*   `POST /api/ratings/`: Submits or updates a game rating.
*   `POST /api/reviews/`: Submits a text review.

---

## 3. Frontend Internal Flows

### A. Flux de Chargement (GamePage)
1.  **Read Data:** Load game data via `fetchIgdbGameById` (IGDB-first or DB-first) without triggering persistence.
2.  **User Context:** Separately fetch user-specific state (`user_library`, `user_rating`) if the game has a `django_id`.

### B. Flux d'Action (Persistence)
When a user interacts with the UI (e.g., clicking "Add to Library"):
1.  **Resolve:** Call `resolveGameIdIfNeeded(game)`. If `django_id` is null, it triggers the resolution route.
2.  **Execute Action:** Once a valid `django_id` is obtained, call the corresponding action endpoint (`PATCH /api/me/games/`, etc.).

---

## 4. Business Rules & Data Integrity

### Creation Logic
> [!IMPORTANT]
> The simple act of viewing a game page does NOT create a record in the database. 
> Persistence only occurs during an **explicit resolution** or a **persistent action**.

### User Library Auto-creation
The backend implements "Upsert" logic (get-or-create) for `UserGame` to ensure a smooth user experience.

1.  **Rating/Review as First Action:** If the user rates or reviews a game not yet in their library, a `UserGame` is automatically created with the status **`TERMINE`**.
2.  **Favorite as First Action:** If the user marks a game as a favorite before setting a status, a `UserGame` is created with the default status **`ENVIE_DE_JOUER`**.
3.  **Stability:** If a `UserGame` already exists, its current status must **NEVER** be implicitly modified by a rating or favorite action.

### Reviews and Ratings
*   **Decoupled at DB Level:** In the database, a `Review` does not strictly require a `Rating` record, and vice versa. 
*   **Coupled at Interface Level:** The frontend often presents them as part of the same "Opinion" context, but the backend maintains flexibility.

---
