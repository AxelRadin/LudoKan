import { useEffect, useState } from "react";
import { type IgdbGame } from "../api/apiClient";

const BACKEND_URL = "http://localhost:3001";

async function fetchCollectionGames(collectionId: number, limit = 50, offset = 0): Promise<IgdbGame[]> {
  const res = await fetch(`${BACKEND_URL}/api/collection/${collectionId}/games?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useCollectionGames(collectionId: number, page: number, pageSize = 48) {
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
      .catch((e) => setError(e?.message ?? "Erreur"))
      .finally(() => setLoading(false));
  }, [collectionId, page, pageSize]);

  return { games, loading, error };
}
