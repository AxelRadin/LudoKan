import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminUser } from '../types/admin';

type UseAdminUsersReturn = {
  users: AdminUser[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminUsers(
  search = '',
  page = 1,
  pageSize = 20
): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const data = await apiGet(`/api/admin/users/?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setUsers(list);
      setCount(data.count ?? list.length);
    } catch {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, count, loading, error, refetch: fetchUsers };
}
