import { useEffect, useState } from 'react';
import { fetchRecommendations } from '../api/recommendations';
import type { NormalizedGame } from '../types/game';

export interface UseRecommendationsResult {
  games: NormalizedGame[];
  loading: boolean;
}

export function useRecommendations(): UseRecommendationsResult {
  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    fetchRecommendations()
      .then(data => {
        setGames(data);
      })
      .catch((err: unknown) => {
        const e = err as { name?: string };
        if (e?.name !== 'AbortError') {
          setGames([]);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { games, loading };
}
