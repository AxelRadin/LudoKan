import SearchIcon from '@mui/icons-material/Search';
import {
  Avatar,
  Box,
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
import { apiGet } from '../services/api';

type Game = {
  id: number;
  name: string;
  cover_url?: string;
  year?: number;
  source?: string;
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
}));

const GameSearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [localResults, setLocalResults] = useState<Game[]>([]);
  const [igdbResults, setIgdbResults] = useState<Game[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingIgdb, setLoadingIgdb] = useState(false);
  const [igdbDelay, setIgdbDelay] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const igdbTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query) {
      setLocalResults([]);
      setIgdbResults([]);
      setLoadingLocal(false);
      setLoadingIgdb(false);
      setIgdbDelay(false);
      setShowDropdown(false);
      return;
    }
    setLoadingLocal(true);
    setShowDropdown(true);
    apiGet(`/games/search/?q=${encodeURIComponent(query)}`)
      .then(res =>
        setLocalResults(
          (res || []).map((g: any) => ({ ...g, source: 'local' }))
        )
      )
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
      apiGet(`/games/search_igdb/?q=${encodeURIComponent(query)}`)
        .then(res =>
          setIgdbResults(
            (res || []).map((g: any) => ({ ...g, source: 'igdb' }))
          )
        )
        .finally(() => setLoadingIgdb(false));
    }, 1000);

    return () => {
      if (igdbTimeout.current) clearTimeout(igdbTimeout.current);
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

  const allResults = [...localResults, ...igdbResults];

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
        />
        {(loadingLocal || igdbDelay || loadingIgdb) && (
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
          {loadingLocal || igdbDelay || loadingIgdb ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : allResults.length === 0 ? (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Aucun résultat
              </Typography>
            </Box>
          ) : (
            <List>
              {allResults.map(game => (
                <React.Fragment key={`${game.source}-${game.id}`}>
                  <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                    <ListItemButton>
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
        </Dropdown>
      )}
    </Box>
  );
};

export default GameSearchBar;
