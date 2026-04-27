import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminStats } from '../types/admin';

type UseAdminStatsReturn = {
  data: AdminStats | null;
  loading: boolean;
  error: string | null;
};

export function useAdminStats(): UseAdminStatsReturn {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const res = await apiGet('/api/admin/stats/', {
          signal: controller.signal,
        });
        setData(res as AdminStats);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    return () => controller.abort();
  }, []);

  return { data, loading, error };
}
