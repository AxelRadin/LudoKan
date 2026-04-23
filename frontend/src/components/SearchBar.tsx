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
import { styled } from '@mui/material/styles';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type IgdbGame, searchIgdbGames } from '../api/igdb';
import { useFuzzyGames, type MatchIndices } from '../hooks/useFuzzyGames';
import { apiGet } from '../services/api';
import type { NormalizedGame } from '../types/game';

type SearchSourcedGame = NormalizedGame & { source: 'local' | 'igdb' };

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '999px',
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.07)'
      : 'rgba(0,0,0,0.06)',
  border: '1.5px solid transparent',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.11)'
        : 'rgba(0,0,0,0.09)',
  },
  '&:focus-within': {
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.13)'
        : 'rgba(255,255,255,1)',
    borderColor: '#FF3D3D',
    boxShadow: '0 0 0 3px rgba(255, 61, 61, 0.15)',
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
  color:
    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.2, 2, 1.2, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '32ch',
      '&:focus': {
        width: '40ch',
      },
    },
    '&::placeholder': {
      color:
        theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.4)'
          : 'rgba(0,0,0,0.35)',
      opacity: 1,
    },
  },
}));

const Dropdown = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: '110%',
  left: 0,
  width: '100%',
  zIndex: 20,
  borderRadius: '16px',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.6)'
      : '0 8px 32px rgba(0,0,0,0.15)',
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.06)'
  }`,
  padding: theme.spacing(1, 0),
  marginTop: theme.spacing(1),
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'min(420px, 55vh)',
  overflow: 'hidden',
}));

type HighlightedTextProps = Readonly<{
  text: string;
  indices: MatchIndices;
}>;

function HighlightedText({ text, indices }: HighlightedTextProps) {
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

const SEARCH_DEBOUNCE_MS = 280;
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

function parseLocalSearchResponse(res: unknown): SearchSourcedGame[] {
  const rawResults = Array.isArray(res)
    ? res
    : ((res as { results?: unknown[] })?.results ?? []);
  return rawResults.map(mapLocalToSearchGame) as SearchSourcedGame[];
}

function mapIgdbGamesToSearch(games: IgdbGame[]): SearchSourcedGame[] {
  return games.map(mapIgdbToSearchGame);
}

function mergeUniqueIntoPool(
  prev: SearchSourcedGame[],
  incoming: SearchSourcedGame[]
): SearchSourcedGame[] {
  const seen = new Set(prev.map(g => g.igdb_id));
  const fresh = incoming.filter(g => !seen.has(g.igdb_id));
  return [...prev, ...fresh];
}

async function fetchSearchGameLists(
  q: string,
  igdbMax: number,
  signal: AbortSignal
): Promise<{ local: SearchSourcedGame[]; igdb: SearchSourcedGame[] }> {
  const localReq = apiGet(`/api/games/?search=${encodeURIComponent(q)}`)
    .then(parseLocalSearchResponse)
    .catch(() => [] as SearchSourcedGame[]);

  const igdbReq = searchIgdbGames(q, igdbMax, false, signal)
    .then(mapIgdbGamesToSearch)
    .catch(() => [] as SearchSourcedGame[]);

  const [local, igdb] = await Promise.all([localReq, igdbReq]);
  return { local, igdb };
}

const GameSearchBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [gamePool, setGamePool] = useState<SearchSourcedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

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

    const run = async () => {
      try {
        const { local, igdb } = await fetchSearchGameLists(
          debouncedQuery,
          DROPDOWN_IGDB_MAX,
          controller.signal
        );
        if (cancelled) return;
        const incoming = [...local.slice(0, DROPDOWN_LOCAL_MAX), ...igdb];
        setGamePool(prev => mergeUniqueIntoPool(prev, incoming));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.game-searchbar-root')) {
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const allResults = useFuzzyGames(gamePool, query);

  useEffect(() => {
    setActiveIndex(-1);
  }, [allResults.length, debouncedQuery]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

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
          <SearchIcon fontSize="small" />
        </SearchIconWrapper>
        <StyledInputBase
          placeholder={t('searchBar.placeholder')}
          inputProps={{ 'aria-label': 'search' }}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query && setShowDropdown(true)}
          onKeyDown={e => {
            if (!showDropdown) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex(i => Math.min(i + 1, allResults.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex(i => Math.max(i - 1, -1));
            } else if (e.key === 'Escape') {
              setShowDropdown(false);
              setActiveIndex(-1);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (activeIndex >= 0 && allResults[activeIndex]) {
                handlePickGame(allResults[activeIndex].item);
              } else if (query.trim()) {
                goToFullSearch();
              }
            }
          }}
        />
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <CircularProgress size={16} sx={{ color: '#FF3D3D' }} />
          </Box>
        )}
      </Search>

      {showDropdown && query && (
        <Dropdown>
          <Box px={2} pb={1} flexShrink={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: '0.08em' }}
            >
              {t('searchBar.results')}
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
              <CircularProgress size={24} sx={{ color: '#FF3D3D' }} />
            </Box>
          ) : allResults.length === 0 ? (
            <Box sx={{ px: 2, py: 1, flexShrink: 0 }}>
              <Typography variant="body2" color="text.secondary">
                {t('searchBar.noResults')}
              </Typography>
            </Box>
          ) : (
            <List
              ref={listRef}
              dense
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', py: 0 }}
            >
              {allResults.map(({ item: game, nameIndices }, index) => {
                const releaseYear = game.release_date
                  ? new Date(game.release_date).getFullYear()
                  : null;
                const isActive = index === activeIndex;
                return (
                  <React.Fragment key={`${game.source}-${game.igdb_id}`}>
                    <ListItem disablePadding data-index={index}>
                      <ListItemButton
                        onClick={() => handlePickGame(game)}
                        selected={isActive}
                        sx={{
                          px: 2,
                          py: 1,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 61, 61, 0.06)',
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={game.cover_url ?? undefined}
                            alt={game.name}
                            sx={{
                              width: 40,
                              height: 54,
                              mr: 1.5,
                              borderRadius: '6px',
                              bgcolor: 'rgba(0,0,0,0.1)',
                            }}
                          >
                            {game.name[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              <HighlightedText
                                text={game.name}
                                indices={nameIndices}
                              />
                              {releaseYear && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ ml: 1 }}
                                >
                                  {releaseYear}
                                </Typography>
                              )}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              variant="caption"
                              sx={{
                                color:
                                  game.source === 'local'
                                    ? '#FF3D3D'
                                    : 'text.secondary',
                                fontWeight: game.source === 'local' ? 600 : 400,
                              }}
                            >
                              {game.source === 'local'
                                ? t('searchBar.localSource')
                                : 'IGDB'}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    <Divider component="li" sx={{ opacity: 0.5 }} />
                  </React.Fragment>
                );
              })}
            </List>
          )}

          {!loading && query.trim() && (
            <>
              <Divider sx={{ flexShrink: 0, opacity: 0.5 }} />
              <Box px={1} py={0.5} flexShrink={0}>
                <Button
                  fullWidth
                  size="small"
                  variant="text"
                  onClick={goToFullSearch}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    color: '#FF3D3D',
                    '&:hover': { backgroundColor: 'rgba(255, 61, 61, 0.08)' },
                  }}
                >
                  {allResults.length > 0
                    ? t('searchBar.seeAll', { query: query.trim() })
                    : t('searchBar.fullSearch')}
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
