import { apiGet } from './api';

export interface ChatMessage {
  id: number;
  room_id: number;
  user_id: number;
  content: string;
  created_at: string;
}

interface PaginatedMessages {
  count: number;
  next: string | null;
  previous: string | null;
  results: ChatMessage[];
}

export async function getChatMessages(
  roomId: number,
  page: number = 1
): Promise<PaginatedMessages> {
  return apiGet(`/api/chats/${roomId}/messages?page=${page}`);
}
