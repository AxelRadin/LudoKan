import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminStatsInsights } from '../types/admin';

type Return = Readonly<{
  data: AdminStatsInsights | null;
  loading: boolean;
  error: string | null;
}>;

export function useAdminStatsInsights(): Return {
  const [data, setData] = useState<AdminStatsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInsights() {
      try {
        const res = await apiGet('/api/admin/stats/insights/', {
          signal: controller.signal,
        });
        setData(res as AdminStatsInsights);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Impossible de charger les statistiques détaillées.');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
    return () => controller.abort();
  }, []);

  return { data, loading, error };
}
