import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Tooltip,
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
    setLoading(true);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    const currentQuery = query.trim();

    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await searchIgdbGames(currentQuery, 8, true);

        if (latestQueryRef.current.trim() === currentQuery) {
          setResults(data);
        }
      } catch {
        if (latestQueryRef.current.trim() === currentQuery) {
          setResults([]);
        }
      } finally {
        if (latestQueryRef.current.trim() === currentQuery) {
          setLoading(false);
        }
      }
    }, 500);

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
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Aucun résultat
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.map(game => {
                const cover = getCoverUrl(game.cover);
                const year = game.first_release_date
                  ? new Date(game.first_release_date * 1000).getFullYear()
                  : undefined;
                const displayName = game.display_name ?? game.name;
                return (
                  <React.Fragment key={game.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{ py: 1.5 }}
                      secondaryAction={
                        <Tooltip
                          title={
                            addedIds.has(game.id)
                              ? 'Ajouté !'
                              : 'Ajouter à ma bibliothèque'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={e => handleAddToLibrary(e, game)}
                              disabled={addingId === game.id}
                              color={
                                addedIds.has(game.id) ? 'success' : 'default'
                              }
                            >
                              {addingId === game.id ? (
                                <CircularProgress size={16} />
                              ) : addedIds.has(game.id) ? (
                                <CheckIcon fontSize="small" />
                              ) : (
                                <AddIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      }
                    >
                      <ListItemButton
                        onClick={() => {
                          setShowDropdown(false);
                          setQuery('');
                          navigate(`/game/igdb/${game.id}`);
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={cover ?? undefined}
                            alt={displayName}
                            sx={{
                              width: 48,
                              height: 64,
                              mr: 2,
                              bgcolor: '#eee',
                            }}
                          >
                            {displayName[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <span>
                              <b>{displayName}</b>
                              {year && (
                                <span style={{ color: '#888', marginLeft: 8 }}>
                                  ({year})
                                </span>
                              )}
                            </span>
                          }
                          secondary={
                            game.platforms
                              ?.slice(0, 3)
                              .map(p => p.name)
                              .join(', ') || 'IGDB'
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
