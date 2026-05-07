import { apiGet, apiPost } from './api';

export type PartyStatus =
  | 'open'
  | 'waiting_ready'
  | 'waiting_ready_for_chat'
  | 'countdown'
  | 'chat_active'
  | 'cancelled';

export type ReadyState = 'pending' | 'accepted' | 'declined' | 'timed_out';
export type ReadyForChatState =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'timed_out';

export interface PartyMember {
  user_id: number;
  username?: string;
  membership_status: string;
  ready_state: ReadyState;
  ready_for_chat_state: ReadyForChatState;
  joined_at: string;
  left_at: string | null;
}

export interface Party {
  id: number;
  game: number;
  status: PartyStatus;
  max_players: number;
  chat_room_id: number | null;
  open_deadline_at: string | null;
  ready_deadline_at: string | null;
  ready_for_chat_deadline_at: string | null;
  countdown_started_at: string | null;
  countdown_ends_at: string | null;
  members: PartyMember[];
}

export async function joinOrCreateParty(
  gameId: number,
  maxPlayers?: number
): Promise<Party> {
  const payload: any = { game: gameId };
  if (maxPlayers) payload.max_players = maxPlayers;
  return apiPost('/api/parties/join-or-create', payload);
}

export async function getMyActiveParty(): Promise<Party> {
  return apiGet('/api/parties/me/active');
}

export async function getPartyDetail(partyId: number): Promise<Party> {
  return apiGet(`/api/parties/${partyId}`);
}

export async function markPartyReady(
  partyId: number,
  accepted: boolean = true
): Promise<void> {
  return apiPost(`/api/parties/${partyId}/ready`, { accepted });
}

export async function markPartyReadyForChat(
  partyId: number,
  accepted: boolean = true
): Promise<void> {
  return apiPost(`/api/parties/${partyId}/ready-for-chat`, { accepted });
}

export async function leaveParty(partyId: number): Promise<void> {
  return apiPost(`/api/parties/${partyId}/leave`, {});
}
