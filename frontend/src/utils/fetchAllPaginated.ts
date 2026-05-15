import { apiGet } from '../services/api';

/**
 * Récupère toutes les pages d’une liste API DRF paginée (count / results).
 */
export async function fetchAllPaginated<T>(
  path: string,
  pageSize = 100,
  maxPages = 50
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${path}${sep}page=${page}&page_size=${pageSize}`;
    const data = await apiGet(url);
    const rows = Array.isArray(data) ? data : (data.results ?? []);
    all.push(...(rows as T[]));
    const total = typeof data.count === 'number' ? data.count : rows.length;
    if (rows.length === 0 || all.length >= total) break;
  }
  return all;
}
