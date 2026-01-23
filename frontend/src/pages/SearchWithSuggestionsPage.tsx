import { useState } from "react";
import GameSearchBar from "../components/GameSearchBar";
import { type IgdbGame } from "../api/apiClient";

export default function SearchWithSuggestionsPage() {
    const [selected, setSelected] = useState<IgdbGame | null>(null);

    return (
        <div style={{ padding: 20 }}>
      <h1>Recherche avec suggestions</h1>

      <GameSearchBar onSelect={(g) => setSelected(g)} />

      {selected && (
        <div style={{ marginTop: 20 }}>
          <h2>Sélection :</h2>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
    );
}