import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  fetchFranchiseGames,
  getCoverUrl,
  searchFranchisesAndCollections,
  searchGamesPage,
  type FranchiseResult,
  type IgdbGame,
} from '../api/apiClient';
import GameCard from '../components/GameCard';

const BACKEND_URL = 'http://localhost:3001';
const PAGE_SIZE = 25;

async function fetchCollectionGamesPage(
  collectionId: number,
  limit: number,
  offset: number,
): Promise<IgdbGame[]> {
  const res = await fetch(
    `${BACKEND_URL}/api/collection/${collectionId}/games?limit=${limit}&offset=${offset}`,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

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

    const fetcher: Promise<IgdbGame[]> = selected
      ? selected.type === 'franchise'
        ? fetchFranchiseGames(selected.id, PAGE_SIZE, offset)
        : fetchCollectionGamesPage(selected.id, PAGE_SIZE, offset)
      : searchGamesPage(query, PAGE_SIZE, offset);

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
    setSelected(prev => (prev?.id === f.id && prev?.type === f.type ? null : f));
    setPage(1);
  };

  return (
    <Box sx={{ px: 4, py: 4, ml: 25, mr: 25 }}>
      {/* Header */}
      <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" size="small">
            ← Retour
          </Button>
        </Link>
        <Typography variant="h5" fontWeight="bold">
          Résultats pour : «&nbsp;{query}&nbsp;»
        </Typography>
      </Box>

      {/* Chips licences/collections (apparaissent en arrière-plan) */}
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
              color={selected?.id === f.id && selected?.type === f.type ? 'primary' : 'default'}
              clickable
              size="small"
            />
          ))}
          {selected && (
            <Chip
              label="✕ Tout afficher"
              onClick={() => { setSelected(null); setPage(1); }}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Infos contexte */}
      {selected && (
        <Typography variant="subtitle2" color="text.secondary" mb={2}>
          {selected.type === 'franchise' ? 'Licence' : 'Série'} :{' '}
          <strong>{selected.name}</strong>
        </Typography>
      )}

      {/* Grille de jeux */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : games.length === 0 ? (
        <Typography color="text.secondary" py={4}>
          Aucun jeu trouvé pour « {query} ».
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {games.map(game => (
            <Grid item key={game.id} xs={6} sm={4} md={3} lg={2}>
              <GameCard
                id={game.id}
                title={(game as any).display_name ?? game.name}
                image={getCoverUrl(game.cover) ?? ''}
                coverUrl={getCoverUrl(game.cover)}
                releaseDate={game.first_release_date
                  ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
                  : null}
                igdb
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
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
    </Box>
  );
}
