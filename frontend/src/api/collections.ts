import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';

export type UserCollection = {
  id: number;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  is_visible_on_profile: boolean;
  system_key: 'MA_LUDOTHEQUE' | 'STEAM' | null;
  is_system: boolean;
  games_count: number;
  created_at: string;
  updated_at: string;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function fetchMyCollections(): Promise<UserCollection[]> {
  const data = (await apiGet('/api/me/collections/')) as
    | Paginated<UserCollection>
    | UserCollection[];
  return Array.isArray(data) ? data : data.results;
}

export function createCollection(body: {
  name: string;
  color?: string;
  sort_order?: number;
  is_visible_on_profile?: boolean;
}): Promise<UserCollection> {
  return apiPost('/api/me/collections/', body) as Promise<UserCollection>;
}

export function updateCollection(
  id: number,
  body: Partial<
    Pick<
      UserCollection,
      'name' | 'color' | 'sort_order' | 'is_visible_on_profile'
    >
  >
): Promise<UserCollection> {
  return apiPatch(
    `/api/me/collections/${id}/`,
    body
  ) as Promise<UserCollection>;
}

export function deleteCollection(id: number): Promise<void> {
  return apiDelete(`/api/me/collections/${id}/`) as Promise<void>;
}

export function addGameToCollection(
  collectionId: number,
  userGameId: number
): Promise<void> {
  return apiPost(`/api/me/collections/${collectionId}/entries/`, {
    user_game_id: userGameId,
  }) as Promise<void>;
}

export function removeGameFromCollection(
  collectionId: number,
  userGameId: number
): Promise<void> {
  return apiDelete(
    `/api/me/collections/${collectionId}/entries/${userGameId}/`
  ) as Promise<void>;
}
