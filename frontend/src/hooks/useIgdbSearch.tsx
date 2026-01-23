import { useState, useEffect } from 'react';
import { searchIgdbGames, type IgdbGame } from "../api/apiClient";

export function useIgdbSearch(query: string) {
    const [results, setResults] = useState<IgdbGame[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (!q) {
            setResults([]);
            setError(null);
            return;
        }

        const t = setTimeout (() =>{
            setLoading(true);
            searchIgdbGames(q)
                .then(setResults)
                .catch((e) => setError(e.message ?? "Erreur"))
                .finally(() => setLoading(false));
        }, 300);

        return () => clearTimeout(t);
    }, [query]);
    
    return { results, loading, error
    };
    
}