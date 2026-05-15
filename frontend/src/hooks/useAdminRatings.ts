import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminEntityPick, AdminRatingRow } from '../types/adminReviews';

export type AdminRatingsFilters = {
  games: AdminEntityPick[];
  users: AdminEntityPick[];
};

export const defaultAdminRatingsFilters: AdminRatingsFilters = {
  games: [],
  users: [],
};

type Return = {
  ratings: AdminRatingRow[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminRatings(
  filters: AdminRatingsFilters,
  page: number,
  pageSize: number
): Return {
  const [ratings, setRatings] = useState<AdminRatingRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      for (const g of filters.games) params.append('game_ids', String(g.id));
      for (const u of filters.users) params.append('user_ids', String(u.id));
      const data = await apiGet(`/api/admin/ratings/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setRatings(list as AdminRatingRow[]);
      setCount(typeof data.count === 'number' ? data.count : list.length);
    } catch {
      setError('Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  return { ratings, count, loading, error, refetch: fetchRatings };
}
