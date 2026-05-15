import { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminEntityPick } from '../types/adminReviews';

export function useRemotePicks(
  url: string | null,
  mapRow: (row: unknown) => AdminEntityPick | null
) {
  const [options, setOptions] = useState<AdminEntityPick[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await apiGet(url);
        const list = Array.isArray(data)
          ? data
          : (((data as Record<string, unknown>).results as
              | unknown[]
              | undefined) ?? []);

        const picks: AdminEntityPick[] = [];
        for (const row of list) {
          const p = mapRow(row);
          if (p) picks.push(p);
        }

        if (!cancelled) setOptions(picks);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, mapRow]);

  return { options, loading };
}
