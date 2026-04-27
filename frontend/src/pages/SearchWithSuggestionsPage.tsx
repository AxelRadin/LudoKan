import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GameSearchBar from '../components/GameSearchBar';
import { type IgdbGame } from '../api/igdb';

export default function SearchWithSuggestionsPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<IgdbGame | null>(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>{t('searchSuggestions.title')}</h1>
      <GameSearchBar onSelect={g => setSelected(g)} />
      {selected && (
        <div style={{ marginTop: 20 }}>
          <h2>{t('searchSuggestions.selectionTitle')}</h2>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
