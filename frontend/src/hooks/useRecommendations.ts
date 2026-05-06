import { useCallback, useEffect, useState } from 'react';
import { fetchRecommendations } from '../api/recommendations';
import type { NormalizedGame } from '../types/game';

export interface UseRecommendationsResult {
  games: NormalizedGame[];
  loading: boolean;
  refetch: () => void;
}

export function useRecommendations(): UseRecommendationsResult {
  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchCount, setFetchCount] = useState(0);

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
  }, [fetchCount]);

  const refetch = useCallback(() => {
    setFetchCount(c => c + 1);
  }, []);

  return { games, loading, refetch };
}
