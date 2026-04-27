import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';

export type AdminUser = {
  id: number;
  pseudo?: string;
  username?: string;
  email: string;
  is_superuser: boolean;
  roles: string[];
  created_at?: string;
};

type UseAdminUsersReturn = {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
};

export function useAdminUsers(): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await apiGet('/api/admin/users/', {
          signal: controller.signal,
        });
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setUsers(list);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Erreur lors du chargement des utilisateurs');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return { users, loading, error };
}
