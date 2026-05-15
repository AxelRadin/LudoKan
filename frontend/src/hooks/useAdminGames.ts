import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminGameListItem } from '../types/adminGames';

type UseAdminGamesReturn = {
  games: AdminGameListItem[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminGames(
  nameFilter = '',
  page = 1,
  pageSize = 20,
  statusFilter = ''
): UseAdminGamesReturn {
  const [games, setGames] = useState<AdminGameListItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const trimmed = nameFilter.trim();
      if (trimmed) params.set('name', trimmed);
      if (statusFilter.trim()) params.set('status', statusFilter.trim());
      const data = await apiGet(`/api/admin/games/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setGames(list as AdminGameListItem[]);
      setCount(typeof data.count === 'number' ? data.count : list.length);
    } catch {
      setError('Erreur lors du chargement des jeux');
    } finally {
      setLoading(false);
    }
  }, [nameFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, count, loading, error, refetch: fetchGames };
}
