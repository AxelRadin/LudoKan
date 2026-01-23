import { useEffect, useRef, useState } from "react";
import { searchIgdbGames, type IgdbGame } from "../api/apiClient";

function normalizeQuery(q: string) {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .trim();
}

export function useIgdbSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // permet d'ignorer les réponses en retard
  const requestIdRef = useRef(0);

  useEffect(() => {
    const raw = query ?? "";
    const q = raw.trim();

    // ✅ suggestions dès 1 caractère (au lieu de 2)
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

      // ✅ on normalise côté front (accents) pour aider les matchs
      const qNormalized = normalizeQuery(q);

      searchIgdbGames(qNormalized, 8, true)
        .then((data) => {
          if (currentRequestId !== requestIdRef.current) return;
          setSuggestions(data);
    })
        .catch((e) => {
          if (currentRequestId !== requestIdRef.current) return;
          setError(e?.message ?? "Erreur");
          setSuggestions([]);
        })
        .finally(() => {
          if (currentRequestId !== requestIdRef.current) return;
          setLoading(false);
        });
    }, 200); // ✅ un peu plus réactif que 250ms

    return () => clearTimeout(t);
  }, [query]);

  return { suggestions, loading, error, setSuggestions };
}
