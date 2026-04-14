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
import { useFuzzyGames, type MatchIndices } from '../hooks/useFuzzyGames';
import { apiGet } from '../services/api';
import type { NormalizedGame } from '../types/game';

// Local API result mapped to NormalizedGame for a unified type across all sources
type SearchSourcedGame = NormalizedGame & { source: 'local' | 'igdb' };

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

/** Renders `text` with matched character ranges wrapped in a highlighted mark. */
function HighlightedText({
  text,
  indices,
}: {
  text: string;
  indices: MatchIndices;
}) {
  if (!indices.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of indices) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={start}
        style={{
          background: 'rgba(255, 200, 0, 0.45)',
          borderRadius: 2,
          padding: '0 1px',
          fontWeight: 700,
        }}
      >
        {text.slice(start, end + 1)}
      </mark>
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

/** Un seul debounce puis requêtes locale + IGDB en parallèle, résultats affichés ensemble */
const SEARCH_DEBOUNCE_MS = 280;
/** Aperçu dans le menu : la liste complète + filtres licences/collections est sur /search */
const DROPDOWN_LOCAL_MAX = 5;
const DROPDOWN_IGDB_MAX = 8;

function mapIgdbToSearchGame(g: IgdbGame): SearchSourcedGame {
  return { ...g, source: 'igdb' };
}

function mapLocalToSearchGame(g: any): SearchSourcedGame {
  return {
    igdb_id: g.igdb_id ?? 0,
    django_id: g.id ?? null,
    name: g.name ?? '',
    summary: g.description ?? null,
    cover_url: g.cover_url ?? null,
    release_date: g.release_date ?? null,
    platforms: g.platforms ?? [],
    genres: g.genres ?? [],
    user_library: g.user_library ?? null,
    user_rating: g.user_rating ?? null,
    source: 'local',
  };
}

const GameSearchBar: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  // Pool of all games fetched across debounced queries — persists across keystrokes
  // so Fuse.js can still match even when the API returns nothing for a typo.
  const [gamePool, setGamePool] = useState<SearchSourcedGame[]>([]);
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
      setGamePool([]);
      setLoading(false);
      setShowDropdown(false);
      return;
    }
    setShowDropdown(true);
    setLoading(true);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setGamePool([]);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    const localReq = apiGet(
      `/api/games/?search=${encodeURIComponent(debouncedQuery)}`
    )
      .then(res => {
        const rawResults = Array.isArray(res)
          ? res
          : ((res as { results?: unknown[] })?.results ?? []);
        return rawResults.map((g: any) =>
          mapLocalToSearchGame(g)
        ) as SearchSourcedGame[];
      })
      .catch(() => [] as SearchSourcedGame[]);

    const igdbReq = searchIgdbGames(
      debouncedQuery,
      DROPDOWN_IGDB_MAX,
      false,
      controller.signal
    )
      .then(games => games.map(mapIgdbToSearchGame))
      .catch(() => [] as SearchSourcedGame[]);

    Promise.all([localReq, igdbReq])
      .then(([local, igdb]) => {
        if (cancelled) return;
        const incoming = [...local.slice(0, DROPDOWN_LOCAL_MAX), ...igdb];
        // Merge into pool, deduplicating by igdb_id to avoid visual duplicates
        setGamePool(prev => {
          const seen = new Set(prev.map(g => g.igdb_id));
          const fresh = incoming.filter(g => !seen.has(g.igdb_id));
          return [...prev, ...fresh];
        });
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

  // Re-rank the pool against the live query so typo corrections update instantly
  const allResults = useFuzzyGames(gamePool, query);

  const goToFullSearch = () => {
    const q = query.trim();
    if (!q) return;
    setShowDropdown(false);
    setQuery('');
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handlePickGame = (game: SearchSourcedGame) => {
    if (game.source === 'local' && game.django_id) {
      navigate(`/game/${game.django_id}`);
    } else {
      navigate(`/game/igdb/${game.igdb_id}`);
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
              {allResults.map(({ item: game, nameIndices }) => {
                const releaseYear = game.release_date
                  ? new Date(game.release_date).getFullYear()
                  : null;
                return (
                  <React.Fragment key={`${game.source}-${game.igdb_id}`}>
                    <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                      <ListItemButton onClick={() => handlePickGame(game)}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={game.cover_url ?? undefined}
                            alt={game.name}
                            sx={{
                              width: 48,
                              height: 64,
                              mr: 2,
                              bgcolor: '#eee',
                            }}
                          >
                            {game.name[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <span>
                              <b>
                                <HighlightedText
                                  text={game.name}
                                  indices={nameIndices}
                                />
                              </b>
                              {releaseYear && (
                                <span style={{ color: '#888', marginLeft: 8 }}>
                                  ({releaseYear})
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
                );
              })}
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
