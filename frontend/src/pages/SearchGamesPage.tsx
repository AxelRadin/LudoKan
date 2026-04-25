import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIgdbSearch } from '../hooks/useIgdbSearch';

export default function SearchGamesPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { results, loading, error } = useIgdbSearch(query);

  return (
    <div style={{ padding: 20 }}>
      <h1>{t('searchGames.title')}</h1>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('searchGames.placeholder')}
        style={{ padding: 10, width: '100%', maxWidth: 500 }}
      />
      {loading && <p>{t('searchGames.loading')}</p>}
      {error && <p>{t('searchGames.error', { message: error })}</p>}
      <ul>
        {results.map(g => (
          <li key={g.id}>{g.name}</li>
        ))}
      </ul>
    </div>
  );
}
