import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export type AdminTicket = {
  id: number;
  category: string;
  subject: string;
  status: string;
  user_pseudo?: string | null;
  user_email?: string | null;
  created_at: string;
};

type UseAdminTicketsReturn = {
  tickets: AdminTicket[];
  loading: boolean;
  error: string | null;
};

export function useAdminTickets(): UseAdminTicketsReturn {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiGet('/api/admin/support/tickets/', {
          signal: controller.signal,
        });
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setTickets(list);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Erreur lors du chargement du support');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return { tickets, loading, error };
}
