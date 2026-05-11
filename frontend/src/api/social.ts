import { apiDelete, apiGet, apiPost } from '../services/api';

export type FriendRequestRow = {
  id: number;
  from_user: { id: number; pseudo: string; avatar_url?: string | null };
  to_user: { id: number; pseudo: string; avatar_url?: string | null };
  status: string;
  created_at: string;
  updated_at: string;
};

export type FriendRow = {
  id: number;
  pseudo: string;
  avatar_url?: string | null;
  friends_count: number;
};

/** Résultat de recherche utilisateur (pseudo / nom). */
export type UserSearchHit = {
  id: number;
  pseudo: string;
  avatar_url?: string | null;
};

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function unwrapResults<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function sendFriendRequest(body: {
  to_user_id?: number;
  to_pseudo?: string;
}): Promise<FriendRequestRow & { auto_accepted?: boolean; detail?: string }> {
  return apiPost('/api/social/friend-requests/', body) as Promise<
    FriendRequestRow & { auto_accepted?: boolean; detail?: string }
  >;
}

export function acceptFriendRequest(id: number): Promise<{ detail: string }> {
  return apiPost(`/api/social/friend-requests/${id}/accept/`, {}) as Promise<{
    detail: string;
  }>;
}

export function declineFriendRequest(id: number): Promise<{ detail: string }> {
  return apiPost(`/api/social/friend-requests/${id}/decline/`, {}) as Promise<{
    detail: string;
  }>;
}

export function cancelFriendRequest(id: number): Promise<void> {
  return apiPost(
    `/api/social/friend-requests/${id}/cancel/`,
    {}
  ) as Promise<void>;
}

export async function fetchFriends(): Promise<FriendRow[]> {
  const data = (await apiGet('/api/social/friends/')) as
    | Paginated<FriendRow>
    | FriendRow[];
  return unwrapResults(data);
}

/** Demandes en attente : `incoming` = reçues, `outgoing` = envoyées. */
export async function fetchFriendRequests(
  direction: 'incoming' | 'outgoing'
): Promise<FriendRequestRow[]> {
  const data = (await apiGet(
    `/api/social/friend-requests/?direction=${direction}`
  )) as Paginated<FriendRequestRow> | FriendRequestRow[];
  return unwrapResults(data);
}

export function removeFriend(userId: number): Promise<void> {
  return apiDelete(`/api/social/friends/${userId}/`) as Promise<void>;
}

/** Recherche de joueurs (min. 2 caractères). Réservé aux utilisateurs connectés. */
export async function searchUsersForFriends(
  q: string
): Promise<UserSearchHit[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const data = (await apiGet(
    `/api/social/users/search/?q=${encodeURIComponent(trimmed)}`
  )) as UserSearchHit[] | Paginated<UserSearchHit>;
  return Array.isArray(data) ? data : unwrapResults(data);
}
