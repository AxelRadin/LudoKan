import {
  Box,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminGames } from '../../hooks/useAdminGames';
import ErrorAlert from './ErrorAlert';
import LoadingSkeleton from './LoadingSkeleton';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'released', label: 'Released' },
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'early_access', label: 'Early Access' },
  { value: 'offline', label: 'Offline' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rumored', label: 'Rumored' },
  { value: 'delisted', label: 'Delisted' },
];

export default function GamesTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { games, count, loading, error } = useAdminGames(
    debouncedSearch,
    page + 1,
    pageSize,
    status
  );

  useEffect(() => {
    setPage(0);
  }, [status]);

  if (error) return <ErrorAlert message={error} />;

  const gridCols = {
    xs: 'minmax(0,1fr) 40px',
    sm: 'minmax(0,1fr) minmax(0,100px) minmax(72px,88px) 40px',
  } as const;

  const cellTextSx = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  } as const;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <TextField
          placeholder="Rechercher par nom"
          size="small"
          fullWidth
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          }}
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          select
          label="Statut"
          size="small"
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ minWidth: { sm: 200 } }}
        >
          {STATUS_OPTIONS.map(opt => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            columnGap: 1,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              minWidth: 0,
            }}
          >
            Jeu
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              display: { xs: 'none', sm: 'block' },
              minWidth: 0,
            }}
          >
            Éditeur
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontSize: 11,
              display: { xs: 'none', sm: 'block' },
              minWidth: 0,
            }}
          >
            Statut
          </Typography>
          <span />
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>
            <LoadingSkeleton variant="table" count={6} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={28} />
            </Box>
          </Box>
        ) : games.length === 0 ? (
          <Typography sx={{ p: 3, color: 'text.secondary', fontSize: 14 }}>
            Aucun jeu trouvé.
          </Typography>
        ) : (
          games.map(g => (
            <Box
              key={g.id}
              component="button"
              type="button"
              onClick={() => navigate(`/admin/games/${g.id}`)}
              sx={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                columnGap: 1,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                textAlign: 'left',
                px: { xs: 2, sm: 3 },
                py: 2,
                alignItems: 'center',
                border: 0,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'transparent',
                cursor: 'pointer',
                color: 'text.primary',
                '&:last-of-type': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, ...cellTextSx }}
                  title={g.name}
                >
                  {g.name}
                </Typography>
                {g.summary ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      display: 'block',
                      mt: 0.25,
                      ...cellTextSx,
                    }}
                    title={g.summary}
                  >
                    {g.summary}
                  </Typography>
                ) : null}
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  display: { xs: 'none', sm: 'block' },
                  minWidth: 0,
                  ...cellTextSx,
                }}
                title={g.publisher?.name ?? undefined}
              >
                {g.publisher?.name ?? '—'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  textTransform: 'capitalize',
                  display: { xs: 'none', sm: 'block' },
                  minWidth: 0,
                  ...cellTextSx,
                }}
                title={g.status ?? undefined}
              >
                {g.status ?? '—'}
              </Typography>
              <ChevronRightIcon
                sx={{
                  color: 'text.secondary',
                  justifySelf: 'end',
                  flexShrink: 0,
                }}
              />
            </Box>
          ))
        )}
      </Box>

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Par page :"
        sx={{ mt: 1, width: '100%', maxWidth: '100%', overflow: 'auto' }}
      />
    </Box>
  );
}
