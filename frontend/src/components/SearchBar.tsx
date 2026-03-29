import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  InputBase,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type IgdbGame, searchIgdbGames } from '../api/igdb';
import { apiGet } from '../services/api';

type Game = {
  id: number;
  name: string;
  cover_url?: string;
  year?: number;
  source: 'local' | 'igdb';
};

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
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(420px, 55vh)',
  overflow: 'hidden',
}));

/** Un seul debounce puis requêtes locale + IGDB en parallèle, résultats affichés ensemble */
const SEARCH_DEBOUNCE_MS = 280;
/** Aperçu dans le menu : la liste complète + filtres licences/collections est sur /search */
const DROPDOWN_LOCAL_MAX = 5;
const DROPDOWN_IGDB_MAX = 8;

function mapIgdbToGame(g: IgdbGame): Game {
  return {
    id: g.igdb_id,
    name: g.name,
    cover_url: g.cover_url || undefined,
    year: g.release_date ? new Date(g.release_date).getFullYear() : undefined,
    source: 'igdb',
  };
}

const GameSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [localResults, setLocalResults] = useState<Game[]>([]);
  const [igdbResults, setIgdbResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query) {
      setDebouncedQuery('');
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  useEffect(() => {
    if (!query) {
      setLocalResults([]);
      setIgdbResults([]);
      setLoading(false);
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);
    setLoading(true);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setLocalResults([]);
      setIgdbResults([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setLocalResults([]);
    setIgdbResults([]);

    const localReq = apiGet(
      `/api/games/?search=${encodeURIComponent(debouncedQuery)}`
    )
      .then(res => {
        const rawResults = Array.isArray(res)
          ? res
          : ((res as { results?: unknown[] })?.results ?? []);
        return rawResults.map((g: any) => ({
          id: g.id,
          name: g.name,
          cover_url: g.cover_url,
          source: 'local' as const,
          year: g.release_date
            ? new Date(g.release_date).getFullYear()
            : undefined,
        })) as Game[];
      })
      .catch(() => [] as Game[]);

    const igdbReq = searchIgdbGames(
      debouncedQuery,
      DROPDOWN_IGDB_MAX,
      false,
      controller.signal
    )
      .then(games => games.map(mapIgdbToGame))
      .catch(() => [] as Game[]);

    Promise.all([localReq, igdbReq])
      .then(([local, igdb]) => {
        if (cancelled) return;
        setLocalResults(local.slice(0, DROPDOWN_LOCAL_MAX));
        setIgdbResults(igdb);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.game-searchbar-root')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allResults = [...localResults, ...igdbResults];

  const goToFullSearch = () => {
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    setQuery('');
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handlePickGame = (game: Game) => {
    if (game.source === 'local') {
      navigate(`/game/${game.id}`);
    } else {
      navigate(`/game/igdb/${game.id}`);
    }
    setShowDropdown(false);
    setQuery('');
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
              e.preventDefault();
              goToFullSearch();
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
          <Box px={2} pb={1} flexShrink={0}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontWeight: 700 }}
            >
              RÉSULTATS
            </Typography>
          </Box>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                py: 3,
                flexShrink: 0,
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : allResults.length === 0 ? (
            <Box sx={{ px: 2, py: 1, flexShrink: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Aucun résultat
              </Typography>
            </Box>
          ) : (
            <List
              dense
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                py: 0,
              }}
            >
              {allResults.map(game => (
                <React.Fragment key={`${game.source}-${game.id}`}>
                  <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                    <ListItemButton onClick={() => handlePickGame(game)}>
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          src={game.cover_url}
                          alt={game.name}
                          sx={{ width: 48, height: 64, mr: 2, bgcolor: '#eee' }}
                        >
                          {game.name[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <span>
                            <b>{game.name}</b>
                            {game.year && (
                              <span style={{ color: '#888', marginLeft: 8 }}>
                                ({game.year})
                              </span>
                            )}
                          </span>
                        }
                        secondary={
                          game.source === 'local' ? 'Base locale' : 'IGDB'
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
          {!loading && query.trim() && (
            <>
              <Divider sx={{ flexShrink: 0 }} />
              <Box px={1} py={1} flexShrink={0}>
                <Button
                  fullWidth
                  size="small"
                  variant="text"
                  onClick={goToFullSearch}
                >
                  {allResults.length > 0
                    ? `Voir tous les résultats pour « ${query.trim()} »`
                    : 'Recherche complète, filtres et pagination'}
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
