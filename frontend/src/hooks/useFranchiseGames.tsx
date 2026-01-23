import { useEffect, useState } from "react";
import { fetchFranchiseGames, type IgdbGame } from "../api/apiClient";

export function useFranchiseGames(franchiseId: number, page: number, pageSize = 50) {
  const [games, setGames] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!franchiseId) return;

    const offset = (page - 1) * pageSize;

    setLoading(true);
    setError(null);

    fetchFranchiseGames(franchiseId, pageSize, offset)
      .then((data) => setGames(data))
      .catch((e) => setError(e?.message ?? "Erreur"))
      .finally(() => setLoading(false));
  }, [franchiseId, page, pageSize]);

  return { games, loading, error };
}
