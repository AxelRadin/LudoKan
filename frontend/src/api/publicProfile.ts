import type { UserGame } from './userGames';
import { apiGet } from '../services/api';
import type { UserCollection } from './collections';

export type PublicProfileRelation =
  | 'self'
  | 'friends'
  | 'none'
  | 'pending_outgoing'
  | 'pending_incoming';

export type PublicUserProfile = {
  id: number;
  pseudo: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  description_courte?: string;
  created_at?: string;
  review_count?: number;
  steam_id?: string | null;
  xbox_profile?: Record<string, unknown> | null;
  total_playtime?: number;
  games_finished_percentage?: number;
  games_played_percentage?: number;
  total_games_count?: number;
  friends_count?: number;
  relation_to_me?: PublicProfileRelation | null;
  incoming_friend_request_id?: number | null;
  outgoing_friend_request_id?: number | null;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function pathFromDrfNext(next: string | null): string | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    return u.pathname + u.search;
  } catch {
    return null;
  }
}

export async function fetchPublicProfile(
  pseudo: string
): Promise<PublicUserProfile> {
  return apiGet(
    `/api/users/${encodeURIComponent(pseudo)}/profile/`
  ) as Promise<PublicUserProfile>;
}

export type PublicCollectionRow = Pick<
  UserCollection,
  'id' | 'name' | 'color' | 'sort_order'
> & { games_count: number };

export async function fetchPublicCollections(
  pseudo: string
): Promise<PublicCollectionRow[]> {
  const aggregated: PublicCollectionRow[] = [];
  let path: string | null =
    `/api/users/${encodeURIComponent(pseudo)}/collections/`;

  while (path) {
    const data = (await apiGet(path)) as
      | Paginated<PublicCollectionRow>
      | PublicCollectionRow[];
    if (Array.isArray(data)) {
      aggregated.push(...data);
      break;
    }
    aggregated.push(...data.results);
    path = pathFromDrfNext(data.next);
  }
  return aggregated;
}

export async function fetchPublicUserGames(
  pseudo: string
): Promise<UserGame[]> {
  const aggregated: UserGame[] = [];
  let path: string | null = `/api/users/${encodeURIComponent(pseudo)}/games/`;

  while (path) {
    const data = (await apiGet(path)) as Paginated<UserGame> | UserGame[];
    if (Array.isArray(data)) {
      aggregated.push(...data);
      break;
    }
    aggregated.push(...data.results);
    path = pathFromDrfNext(data.next);
  }
  return aggregated;
}

export async function fetchGamesInCommon(pseudo: string): Promise<UserGame[]> {
  const aggregated: UserGame[] = [];
  let path: string | null =
    `/api/users/${encodeURIComponent(pseudo)}/games-in-common/`;

  while (path) {
    const data = (await apiGet(path)) as Paginated<UserGame> | UserGame[];
    if (Array.isArray(data)) {
      aggregated.push(...data);
      break;
    }
    aggregated.push(...data.results);
    path = pathFromDrfNext(data.next);
  }
  return aggregated;
}
