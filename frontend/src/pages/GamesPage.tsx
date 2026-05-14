import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Pagination,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  Drawer,
  Fab,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import GamesGrid from '../components/GamesGrid';
import { GamesFilterSidebar } from '../components/GamesFilterSidebar';
import {
  fetchTrendingGamesWithCount,
  searchGamesPage,
  type IgdbGame,
  type IgdbListFilters,
} from '../api/igdb';
import { bleedUnderHeader } from '../layout/bleedUnderHeader';

const PAGE_SIZE = 24;

export const GamesPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State (derived from URL)
  const [games, setGames] = useState<IgdbGame[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Read params from URL
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'popularity';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const getFilterArray = (key: string): number[] => {
    const val = searchParams.get(key);
    return val ? val.split(',').map(Number) : [];
  };

  const filters: IgdbListFilters = {
    genre: getFilterArray('genre'),
    platform: getFilterArray('platform'),
    theme: getFilterArray('theme'),
    game_mode: getFilterArray('game_mode'),
    player_perspective: getFilterArray('player_perspective'),
  };

  const filtersJson = JSON.stringify(filters);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const activeFilters = JSON.parse(filtersJson);

      if (q.trim()) {
        const results = await searchGamesPage(
          q,
          PAGE_SIZE,
          offset,
          activeFilters,
          sort
        );
        setGames(results);
        setTotalCount(results.length > 0 ? 1000 : 0);
      } else {
        const { games: results, totalCount: total } =
          await fetchTrendingGamesWithCount(
            sort,
            PAGE_SIZE,
            undefined,
            offset,
            undefined,
            activeFilters
          );
        setGames(results);
        setTotalCount(total);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  }, [q, sort, page, filtersJson]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handleFiltersChange = (newFilters: IgdbListFilters) => {
    const newParams = new URLSearchParams(searchParams);

    const setListParam = (key: string, list?: number[]) => {
      if (list && list.length > 0) newParams.set(key, list.join(','));
      else newParams.delete(key);
    };

    setListParam('genre', newFilters.genre);
    setListParam('platform', newFilters.platform);
    setListParam('theme', newFilters.theme);
    setListParam('game_mode', newFilters.game_mode);
    setListParam('player_perspective', newFilters.player_perspective);

    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleReset = () => {
    setSearchParams({ sort });
  };

  const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), 20); // Limit to 20 pages for IGDB performance

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? 'radial-gradient(circle at 50% 0%, rgba(60,40,40,0.15) 0%, transparent 50%), #121212'
          : '#f8f9fa',
        pt: 4,
        pb: 8,
        ...bleedUnderHeader(theme),
      }}
    >
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 5, lg: 8 } }}>
        <Box
          mb={5}
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          alignItems={{ md: 'flex-end' }}
          justifyContent="space-between"
          gap={3}
        >
          <Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 900, mb: 1, letterSpacing: '-1px' }}
            >
              {t('games.title', 'Explorer les jeux')}
            </Typography>
          </Box>

          <Box
            display="flex"
            gap={2}
            flexWrap="wrap"
            width={{ xs: '100%', md: 'auto' }}
          >
            <TextField
              placeholder={t('common.search', 'Rechercher...')}
              value={q}
              onChange={e => updateParam('q', e.target.value)}
              size="small"
              sx={{ minWidth: 260, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: '12px' },
              }}
            />

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>{t('common.sort', 'Trier par')}</InputLabel>
              <Select
                value={sort}
                label={t('common.sort', 'Trier par')}
                onChange={e => updateParam('sort', e.target.value)}
                sx={{ borderRadius: '12px' }}
              >
                <MenuItem value="popularity">
                  {t('games.sort.popularity', 'Popularité')}
                </MenuItem>
                <MenuItem value="recent">
                  {t('games.sort.recent', 'Récent')}
                </MenuItem>
                <MenuItem value="rating">
                  {t('games.sort.rating', 'Mieux notés')}
                </MenuItem>
                <MenuItem value="most_rated">
                  {t('games.sort.mostRated', 'Plus notés')}
                </MenuItem>
                <MenuItem value="name">
                  {t('games.sort.name', 'Nom (A-Z)')}
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Grid container spacing={4}>
          {/* Sidebar Desktop */}
          <Grid item md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <GamesFilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleReset}
            />
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={10}>
                <CircularProgress size={60} thickness={4} />
              </Box>
            ) : (
              <>
                <GamesGrid
                  games={games}
                  loading={false}
                  emptyMessage={t(
                    'games.empty',
                    'Aucun jeu ne correspond à vos critères.'
                  )}
                />

                {totalPages > 1 && (
                  <Box mt={6} display="flex" justifyContent="center">
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, v) => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('page', String(v));
                        setSearchParams(newParams);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      color="primary"
                      size="large"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          fontWeight: 700,
                          borderRadius: '12px',
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Mobile Fab & Drawer */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          display: { md: 'none' },
        }}
        onClick={() => setMobileSidebarOpen(true)}
      >
        <FilterListIcon />
      </Fab>

      <Drawer
        anchor="left"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        PaperProps={{ sx: { width: '280px', p: 2 } }}
      >
        <GamesFilterSidebar
          filters={filters}
          onFiltersChange={newFilters => {
            handleFiltersChange(newFilters);
            setMobileSidebarOpen(false);
          }}
          onReset={() => {
            handleReset();
            setMobileSidebarOpen(false);
          }}
        />
      </Drawer>
    </Box>
  );
};

export default GamesPage;
