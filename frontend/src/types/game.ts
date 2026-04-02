/**
 * Structure of a Platform entity tied to a Game.
 * `id` is the platform's Django ID (could be optional before the entity is created).
 * `name` is the platform name, e.g. "PC (Microsoft Windows)".
 */
export interface BasePlatform {
  id?: number;
  name: string;
}

/**
 * Structure of a Genre entity tied to a Game.
 * `id` is the genre's Django ID (could be optional before the entity is created).
 * `name` is the genre name, e.g. "Adventure".
 */
export interface BaseGenre {
  id?: number;
  name: string;
}

/**
 * Publisher attached to a game when loaded from the Django API.
 * Omitted for pure IGDB-normalized payloads.
 */
export interface BasePublisher {
  id?: number;
  name: string;
}

/**
 * Information regarding the game's status in the authenticated user's library.
 * `status` represents the current generic state of the game for the user ("ENVIE_DE_JOUER", "EN_COURS", "TERMINE", "ABANDONNE").
 * `is_favorite` is a boolean flag indicating if the user has marked the game as a favorite (coup de cœur).
 */
export interface UserLibraryData {
  status: string;
  is_favorite: boolean;
}

/**
 * Information regarding the authenticated user's personal rating.
 * `value` is the actual rating given.
 * `rating_type` indicates the type of rating (e.g., "etoiles", "sur_100", etc.).
 */
export interface UserRatingData {
  value: number;
  rating_type: string;
}

/**
 * `NormalizedGame` is the unified data contract representing a Game across the application.
 * This structure should be used to normalize responses originating from both the IGDB API and the internal Django backend.
 *
 * Properties:
 * - `igdb_id`: The canonical IGDB identifier of the game. Always present.
 * - `django_id`: The internal Django database ID. It is `null` if the game has not been imported yet.
 * - `name`: The unified game name, directly provided by the backend without requiring frontend adaptation.
 * - `summary`: The description or summary of the game. Can be `null` if the game lacks a description.
 * - `cover_url`: An absolute or relative URL pointer to the game's cover image. `null` if missing.
 * - `release_date`: The release date formatted exactly in ISO-8601 (YYYY-MM-DD). `null` if not available.
 * - `platforms`: A list of the platforms the game is available on. Empty array if none is known.
 * - `genres`: A list of the genres the game is categorized under. Empty array if none is known.
 * - `user_library`: User-specific library tracking information. `null` if the user is unauthenticated or the game is not in their library.
 * - `user_rating`: User-specific rating data. `null` if the user has not rated the game or is unauthenticated.
 * - `publisher`: Present when the payload comes from Django; omitted for IGDB-only responses.
 */
export interface NormalizedGame {
  igdb_id: number;
  django_id: number | null;
  name: string;
  summary: string | null;
  cover_url: string | null;
  release_date: string | null;
  platforms: BasePlatform[];
  genres: BaseGenre[];
  user_library: UserLibraryData | null;
  user_rating: UserRatingData | null;
  publisher?: BasePublisher | null;
  collections?: BasePlatform[];
  franchises?: BasePlatform[];

  // Media fields (from IGDB)
  screenshots?: { url: string }[];
  videos?: { id?: number; video_id: string; name?: string }[];

  // Django specific fields (Optional)
  id?: number;
  min_players?: number | null;
  max_players?: number | null;
  min_age?: number | null;
  rating_avg?: number;
  average_rating?: number;
  rating_count?: number;
  popularity_score?: number;
}
