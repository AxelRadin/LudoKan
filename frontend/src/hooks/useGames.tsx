import { useEffect, useState } from 'react';
import type { GBGame } from '../api/apiClient';
import { fetchGames } from '../api/apiClient';

type UseGamesOptions = {
  limit?: number;
  offset?: number;
  platforms?: number;
  sort?: string;
};

export function useGames(options?: UseGamesOptions) {
  const [games, setGames] = useState<GBGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchGames({
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      platforms: options?.platforms,
      sort: options?.sort ?? 'original_release_date:desc',
    })
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [options?.limit, options?.offset, options?.platforms, options?.sort]);

  return { games, loading, error };
}