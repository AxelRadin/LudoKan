import { useState } from 'react';
import { useIgdbSearch } from '../hooks/useIgdbSearch';

export default function SearchGamesPage() {
    const [query, setQuery] = useState("");
    const { results, loading, error } = useIgdbSearch(query);

    return (
        <div style={{ padding: 20 }}>
      <h1>Recherche de jeux (IGDB)</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ex: Zelda, Pokemon, Mario..."
        style={{ padding: 10, width: "100%", maxWidth: 500 }}
      />

      {loading && <p>Recherche…</p>}
      {error && <p>Erreur : {error}</p>}

      <ul>
        {results.map((g) => (
          <li key={g.id}>{g.name}</li>
        ))}
      </ul>
    </div>
    );
}