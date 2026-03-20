import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchCollectionGames,
  fetchFranchiseGames,
  getCoverUrl,
  searchFranchisesAndCollections,
  searchGamesPage,
  type FranchiseResult,
  type IgdbGame,
} from '../api/igdb';
import GamesGrid from '../components/GamesGrid';
import PageLayout from '../components/PageLayout';

const PAGE_SIZE = 25;

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [franchises, setFranchises] = useState<FranchiseResult[]>([]);
  // null = texte libre, objet = filtre par licence/collection
  const [selected, setSelected] = useState<FranchiseResult | null>(null);
  const [games, setGames] = useState<IgdbGame[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const prevQuery = useRef('');

  // Quand le query change : reset + fetch licences en arrière-plan
  useEffect(() => {
    if (!query) return;
    if (prevQuery.current !== query) {
      prevQuery.current = query;
      setSelected(null);
      setFranchises([]);
      setPage(1);
      // Recherche les franchises/collections en background (pas bloquant)
      searchFranchisesAndCollections(query)
        .then(results => setFranchises(results))
        .catch(() => {});
    }
  }, [query]);

  // Fetch des jeux : dès que query/selected/page change
  useEffect(() => {
    if (!query) return;
    const offset = (page - 1) * PAGE_SIZE;
    setLoading(true);
    setGames([]);

    let fetcher: Promise<IgdbGame[]>;
    if (!selected) {
      fetcher = searchGamesPage(query, PAGE_SIZE, offset);
    } else if (selected.type === 'franchise') {
      fetcher = fetchFranchiseGames(selected.id, PAGE_SIZE, offset);
    } else {
      fetcher = fetchCollectionGames(selected.id, PAGE_SIZE, offset);
    }

    fetcher
      .then(data => {
        // Si la licence/collection ne retourne rien, revenir à la recherche textuelle
        if (data.length === 0 && selected) {
          return searchGamesPage(query, PAGE_SIZE, offset);
        }
        return data;
      })
      .then(data => {
        setGames(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [selected, page, query]);

  const handleSelect = (f: FranchiseResult) => {
    setSelected(prev =>
      prev?.id === f.id && prev?.type === f.type ? null : f
    );
    setPage(1);
  };

  const gridGames = games.map(game => ({
    id: game.id,
    title: (game as any).display_name ?? game.name,
    image: getCoverUrl(game.cover) ?? '',
    coverUrl: getCoverUrl(game.cover),
    releaseDate: game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : null,
  }));

  return (
    <PageLayout title={<>Résultats pour : «&nbsp;{query}&nbsp;»</>}>
      {/* Chips licences/collections */}
      {franchises.length > 0 && (
        <Box mb={3} display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <Typography variant="body2" color="text.secondary" mr={1}>
            Filtrer par licence :
          </Typography>
          {franchises.map(f => (
            <Chip
              key={`${f.type}-${f.id}`}
              label={f.type === 'collection' ? `${f.name} (Série)` : f.name}
              onClick={() => handleSelect(f)}
              color={
                selected?.id === f.id && selected?.type === f.type
                  ? 'primary'
                  : 'default'
              }
              clickable
              size="small"
            />
          ))}
          {selected && (
            <Chip
              label="✕ Tout afficher"
              onClick={() => {
                setSelected(null);
                setPage(1);
              }}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {selected && (
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          {selected.type === 'franchise' ? 'Licence' : 'Série'} :{' '}
          <strong>{selected.name}</strong>
        </Typography>
      )}

      <GamesGrid
        games={gridGames}
        loading={loading}
        emptyMessage={`Aucun jeu trouvé pour « ${query} ».`}
        igdb
      />

      {!loading && (page > 1 || hasMore) && (
        <Box mt={5} display="flex" justifyContent="center">
          <Pagination
            count={hasMore ? page + 1 : page}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            siblingCount={1}
          />
        </Box>
      )}
    </PageLayout>
  );
}
