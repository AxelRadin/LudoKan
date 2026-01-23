import { useEffect, useState } from 'react';
import type { IgdbGame } from '../api/apiClient';
import { searchGames } from "../api/apiClient";

export function useSearchGames(query: string) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setGames([]);
      return;
    }

    setLoading(true);
    setError(null);

    searchGames(query, { limit: 20 })
      .then(setGames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  return { games, loading, error };
}