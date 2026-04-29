import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export type AdminReport = {
  id: number;
  review_excerpt: string;
  reported_by: string;
  created_at: string;
  handled: boolean;
};

type UseAdminReportsReturn = {
  reports: AdminReport[];
  loading: boolean;
  error: string | null;
};

export function useAdminReports(): UseAdminReportsReturn {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiGet('/api/admin/reports/', {
          signal: controller.signal,
        });
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setReports(list);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Erreur lors du chargement des reports');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return { reports, loading, error };
}
