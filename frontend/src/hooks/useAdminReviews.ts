import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminEntityPick, AdminReviewRow } from '../types/adminReviews';

export type AdminReviewsFilters = {
  games: AdminEntityPick[];
  users: AdminEntityPick[];
  createdAfter: string;
  createdBefore: string;
  ordering: string;
};

export const defaultAdminReviewsFilters: AdminReviewsFilters = {
  games: [],
  users: [],
  createdAfter: '',
  createdBefore: '',
  ordering: '-date_created',
};

type UseAdminReviewsReturn = {
  reviews: AdminReviewRow[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminReviews(
  filters: AdminReviewsFilters,
  page: number,
  pageSize: number
): UseAdminReviewsReturn {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (filters.ordering.trim())
        params.set('ordering', filters.ordering.trim());
      for (const g of filters.games) params.append('game_ids', String(g.id));
      for (const u of filters.users) params.append('user_ids', String(u.id));
      if (filters.createdAfter.trim())
        params.set('created_after', filters.createdAfter.trim());
      if (filters.createdBefore.trim())
        params.set('created_before', filters.createdBefore.trim());
      const data = await apiGet(`/api/admin/reviews/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setReviews(list as AdminReviewRow[]);
      setCount(typeof data.count === 'number' ? data.count : list.length);
    } catch {
      setError('Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { reviews, count, loading, error, refetch: fetchReviews };
}
