import { useEffect, useRef, useState } from 'react';
import { searchIgdbGames, type IgdbGame } from '../api/igdb';

function normalizeQuery(q: string) {
  return q
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .trim();
}

export function useIgdbSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const raw = query ?? '';
    const q = raw.trim();

    if (q.length < 1) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    const t = setTimeout(() => {
      setLoading(true);
      setError(null);

      const qNormalized = normalizeQuery(q);

      searchIgdbGames(qNormalized, 8, true)
        .then(data => {
          if (currentRequestId !== requestIdRef.current) return;
          setSuggestions(data);
        })
        .catch(e => {
          if (currentRequestId !== requestIdRef.current) return;
          setError(e?.message ?? 'Erreur');
          setSuggestions([]);
        })
        .finally(() => {
          if (currentRequestId !== requestIdRef.current) return;
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(t);
  }, [query]);

  return { suggestions, loading, error, setSuggestions };
}
