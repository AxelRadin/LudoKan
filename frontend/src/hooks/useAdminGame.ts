import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import type { AdminGameDetail } from '../types/adminGames';

type UseAdminGameReturn = {
  game: AdminGameDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useAdminGame(gameId: number | undefined): UseAdminGameReturn {
  const [game, setGame] = useState<AdminGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGame = useCallback(async () => {
    if (gameId == null || Number.isNaN(gameId)) {
      setGame(null);
      setLoading(false);
      setError('Identifiant de jeu invalide');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/api/admin/games/${gameId}/`);
      setGame(data as AdminGameDetail);
    } catch {
      setError('Impossible de charger ce jeu');
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  return { game, loading, error, refetch: fetchGame };
}
