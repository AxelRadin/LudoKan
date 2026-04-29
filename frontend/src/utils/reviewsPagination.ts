import { apiGet } from '../services/api';

export type PaginatedResults<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function isPaginatedResults<T>(
  data: unknown
): data is PaginatedResults<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as PaginatedResults<T>).results)
  );
}

export type NormalizedReviewPage<T extends { id: number }> = {
  rows: T[];
  totalCount: number;
  nextUrl: string | null;
};

export function normalizePaginatedOrArray<T extends { id: number }>(
  data: T[] | PaginatedResults<T>
): NormalizedReviewPage<T> {
  if (Array.isArray(data)) {
    return { rows: data, totalCount: data.length, nextUrl: null };
  }
  if (isPaginatedResults<T>(data)) {
    return {
      rows: data.results,
      totalCount: data.count,
      nextUrl: data.next,
    };
  }
  return { rows: [], totalCount: 0, nextUrl: null };
}

export function appendUniqueByReviewId<T extends { id: number }>(
  prev: T[],
  incoming: T[]
): T[] {
  const seen = new Set(prev.map(r => r.id));
  const extra = incoming.filter(r => !seen.has(r.id));
  return [...prev, ...extra];
}

/** Extrait `/path?query` depuis une URL absolue DRF ou relative. */
export function drfNextToApiPath(nextUrl: string | null): string | null {
  if (!nextUrl) return null;
  try {
    const u = new URL(nextUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return nextUrl.startsWith('/') ? nextUrl : null;
  }
}

export async function fetchNormalizedReviewPage<T extends { id: number }>(
  url: string
): Promise<NormalizedReviewPage<T>> {
  const data = (await apiGet(url)) as T[] | PaginatedResults<T>;
  return normalizePaginatedOrArray(data);
}
