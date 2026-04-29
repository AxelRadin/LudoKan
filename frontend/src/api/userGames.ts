/**
 * Client API pour la ludothèque utilisateur (Django /api/me/games/).
 * Utilise services/api.ts (même base URL, CSRF, credentials).
 */
import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';

export type UserGameStatus =
  | 'playing'
  | 'finished'
  | 'abandoned'
  | 'wishlist'
  | 'EN_COURS'
  | 'TERMINE'
  | 'ABANDONNE'
  | 'ENVIE_DE_JOUER';

export type UserGame = {
  id: number;
  /** IDs des collections (`/api/me/collections/`) contenant ce jeu. */
  collection_ids?: number[];
  game: {
    id: number;
    name: string;
    cover_url?: string;
    image?: string;
    steam_appid?: number | null;
  };
  game_id?: number;
  /** ID du jeu côté IGDB (si disponible). */
  igdb_game_id?: number | null;
  status: UserGameStatus;
  is_favorite?: boolean;
  date_added?: string;
  hours_played?: number | null;
  playtime_forever?: number | null;
  created_at?: string;
  updated_at?: string;
};

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/** Extrait ``/path?query`` depuis l’URL absolue renvoyée par DRF dans ``next``. */
function pathFromDrfNext(next: string | null): string | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

/**
 * Liste complète des jeux utilisateur (agrège toutes les pages DRF).
 * Sans cela, seuls les ``PAGE_SIZE`` premiers jeux sont visibles sur le profil.
 */
export async function fetchUserGames(): Promise<UserGame[]> {
  const aggregated: UserGame[] = [];
  let path: string | null = '/api/me/games/';

  while (path) {
    const data = (await apiGet(path)) as
      | PaginatedResponse<UserGame>
      | UserGame[];

    if (Array.isArray(data)) {
      aggregated.push(...data);
      break;
    }

    aggregated.push(...data.results);
    path = pathFromDrfNext(data.next);
  }

  return aggregated;
}

/** gameId = Django Game id (pour l’URL, le backend utilise lookup_field=game_id). */
export function addUserGame(
  gameId: number,
  status: UserGameStatus = 'EN_COURS',
  hoursPlayed?: number
): Promise<UserGame> {
  return apiPost('/api/me/games/', {
    game_id: gameId,
    status,
    ...(hoursPlayed != null && { hours_played: hoursPlayed }),
  }) as Promise<UserGame>;
}

/** gameId = Django Game id (backend URL /api/me/games/{game_id}/). */
export function updateUserGame(
  gameId: number,
  data: Partial<Pick<UserGame, 'status' | 'hours_played' | 'is_favorite'>>
): Promise<UserGame> {
  return apiPatch(`/api/me/games/${gameId}/`, data) as Promise<UserGame>;
}

/** gameId = Django Game id. */
export function deleteUserGame(gameId: number): Promise<void> {
  return apiDelete(`/api/me/games/${gameId}/`) as Promise<void>;
}
