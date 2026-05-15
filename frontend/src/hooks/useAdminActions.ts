import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminActionListResponse } from '../types/admin';

type Params = Readonly<{
  page: number;
  pageSize: number;
  actionType: string;
  adminUserId: number | null;
}>;

type Return = Readonly<{
  data: AdminActionListResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}>;

function buildUrl(p: Params): string {
  const q = new URLSearchParams();
  q.set('page', String(p.page + 1));
  q.set('page_size', String(p.pageSize));
  if (p.actionType.trim()) q.set('action_type', p.actionType.trim());
  if (p.adminUserId != null) q.set('admin_user_id', String(p.adminUserId));
  return `/api/admin/actions/?${q.toString()}`;
}

export function useAdminActions(params: Params): Return {
  const [data, setData] = useState<AdminActionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  const { page, pageSize, actionType, adminUserId } = params;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const urlParams = { page, pageSize, actionType, adminUserId };

    (async () => {
      try {
        const res = await apiGet(buildUrl(urlParams), {
          signal: controller.signal,
        });
        setData(res as AdminActionListResponse);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Impossible de charger les actions.');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, pageSize, actionType, adminUserId, tick]);

  return { data, loading, error, refetch };
}
