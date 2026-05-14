import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export type AdminReport = {
  id: number;
  target_type: string;
  target_id: number;
  reporter_label: string;
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
        const normalized = list.map((item: Record<string, unknown>) => {
          const reporter = item.reporter as
            | { pseudo?: string; email?: string }
            | undefined;
          return {
            id: Number(item.id),
            target_type: String(item.target_type ?? 'unknown'),
            target_id: Number(item.target_id ?? 0),
            reporter_label: reporter?.pseudo ?? reporter?.email ?? '—',
            created_at: String(item.created_at ?? ''),
            handled: Boolean(item.handled),
          } satisfies AdminReport;
        });
        setReports(normalized);
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
