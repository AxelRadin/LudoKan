import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  InputBase,
  Paper,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addGameToLibrary,
  getCoverUrl,
  importIgdbGameToDjango,
  searchIgdbGames,
  type IgdbGame,
} from '../api/igdb';
import { useAuth } from '../hooks/useAuth';
import { SearchBarDropdownBody } from './SearchBarDropdownBody';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.05),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.1),
  },
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '30ch',
    },
  },
}));

const Dropdown = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '110%',
  left: 0,
  width: '100%',
  zIndex: 20,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[4],
  padding: theme.spacing(1, 0),
  marginTop: theme.spacing(1),
}));

function toArray<T>(value: T | null | undefined): T[] {
  return value ? [value] : [];
}

function fetchIgdbResults(
  query: string,
  setResults: (results: Game[]) => void,
  setLoading: (loading: boolean) => void
) {
  apiGet(`/games/search_igdb/?q=${encodeURIComponent(query)}`)
    .then(res => {
      const igdbRaw = res || [];
      setResults(igdbRaw.map((g: any) => ({ ...g, source: 'igdb' })));
    })
    .finally(() => setLoading(false));
}

const GameSearchBar: React.FC = () => {
  const navigate = useNavigate();
  useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<IgdbGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const latestQueryRef = useRef('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestQueryRef.current = query;

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    apiGet(`/api/games/${encodeURIComponent(query)}`)
      .then(res => {
        const rawResults = Array.isArray(res) ? res : toArray(res);
        setLocalResults(
          rawResults.map((g: any) => ({ ...g, source: 'local' }))
        );
      })
      .finally(() => setLoadingLocal(false));
  }, [query]);

  useEffect(() => {
    if (!query) return;
    setIgdbResults([]);
    setIgdbDelay(true);
    setLoadingIgdb(false);

    if (igdbTimeout.current) clearTimeout(igdbTimeout.current);

    igdbTimeout.current = setTimeout(() => {
      setIgdbDelay(false);
      setLoadingIgdb(true);
      fetchIgdbResults(query, setIgdbResults, setLoadingIgdb);
    }, 1000);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.game-searchbar-root')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAddToLibrary = async (e: React.MouseEvent, game: IgdbGame) => {
    e.stopPropagation();
    if (addingId === game.id || addedIds.has(game.id)) return;
    setAddingId(game.id);
    try {
      const cover = getCoverUrl(game.cover);
      const releaseDate = game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : null;
      const { id: djangoId } = await importIgdbGameToDjango(
        game.id,
        game.name,
        cover,
        releaseDate
      );
      await addGameToLibrary(djangoId);
      setAddedIds(prev => new Set(prev).add(game.id));
    } catch {
      // already in library or error — ignore silently
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Box
      sx={{ position: 'relative', minWidth: 350 }}
      className="game-searchbar-root"
    >
      <Search>
        <SearchIconWrapper>
          <SearchIcon />
        </SearchIconWrapper>
        <StyledInputBase
          placeholder="Recherchez des jeux…"
          inputProps={{ 'aria-label': 'search' }}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query && setShowDropdown(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && query.trim()) {
              setShowDropdown(false);
              setQuery('');
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
        />
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <CircularProgress size={20} />
          </Box>
        )}
      </Search>
      {showDropdown && query && (
        <Dropdown>
          <Box px={2} pb={1}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              RÉSULTATS
            </Typography>
          </Box>
          <SearchBarDropdownBody
            loading={loading}
            results={results}
            addedIds={addedIds}
            addingId={addingId}
            onAddToLibrary={handleAddToLibrary}
            onGameClick={game => {
              setShowDropdown(false);
              setQuery('');
              navigate(`/game/igdb/${game.id}`);
            }}
          />
          {!loading && results.length > 0 && (
            <>
              <Divider />
              <Box px={1} py={1}>
                <Button
                  fullWidth
                  size="small"
                  onClick={() => {
                    setShowDropdown(false);
                    setQuery('');
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  Voir plus de résultats pour « {query.trim()} »
                </Button>
              </Box>
            </>
          )}
        </Dropdown>
      )}
    </Box>
  );
};

export default GameSearchBar;
