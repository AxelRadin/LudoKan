import { useEffect, useState } from 'react';
import { fetchCollectionGames, type IgdbGame } from '../api/igdb';

export function useCollectionGames(
  collectionId: number,
  page: number,
  pageSize = 48
) {
  const [games, setGames] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) return;
    const offset = (page - 1) * pageSize;

    setLoading(true);
    setError(null);

    fetchCollectionGames(collectionId, pageSize, offset)
      .then(setGames)
      .catch(e => setError(e?.message ?? 'Erreur'))
      .finally(() => setLoading(false));
  }, [collectionId, page, pageSize]);

  return { games, loading, error };
}
