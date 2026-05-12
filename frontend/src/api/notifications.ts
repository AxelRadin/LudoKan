import { apiGet, apiPatch } from '../services/api';
import type {
  NotificationItem,
  PaginatedResponse,
} from '../types/notification';

function normalizePagePath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('/')) return pathOrUrl;
  try {
    const parsed = new URL(pathOrUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return '/api/notifications/';
  }
}

export function fetchNotificationsPage(
  path = '/api/notifications/'
): Promise<PaginatedResponse<NotificationItem>> {
  const normalizedPath = normalizePagePath(path);
  return apiGet(normalizedPath) as Promise<PaginatedResponse<NotificationItem>>;
}

export async function fetchAllNotifications(
  maxPages = 20
): Promise<NotificationItem[]> {
  const all: NotificationItem[] = [];
  let nextPath: string | null = '/api/notifications/';
  let pageCount = 0;

  while (nextPath && pageCount < maxPages) {
    const page = await fetchNotificationsPage(nextPath);
    all.push(...page.results);
    nextPath = page.next ? normalizePagePath(page.next) : null;
    pageCount += 1;
  }

  return all;
}

export function markNotificationRead(
  id: number,
  unread: boolean
): Promise<NotificationItem> {
  return apiPatch(`/api/notifications/${id}/`, {
    unread,
  }) as Promise<NotificationItem>;
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return apiPatch('/api/notifications/mark-all-read/', {}) as Promise<{
    updated: number;
  }>;
}
