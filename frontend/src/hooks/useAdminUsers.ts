import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminUser } from '../types/admin';

type UseAdminUsersReturn = {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminUsers(search = ''): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = search.trim()
        ? `?pseudo=${encodeURIComponent(search.trim())}`
        : '';
      const data = await apiGet(`/api/admin/users/${params}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setUsers(list);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}
