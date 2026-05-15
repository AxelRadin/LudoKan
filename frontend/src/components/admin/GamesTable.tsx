import {
  Box,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useNavigate } from 'react-router-dom';
import { useAdminGames } from '../../hooks/useAdminGames';
import { useAdminTableState } from '../../hooks/useAdminTableState';
import AdminTableContainer from './AdminTableContainer';

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

  const {
    filters,
    draftFilters,
    setDraftFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useAdminTableState({ search: '', status: '' }, 300);

  const { games, count, loading, error } = useAdminGames(
    filters.search,
    page + 1,
    pageSize,
    filters.status
  );

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

  const header = (
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
  );

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
          value={draftFilters.search}
          onChange={e =>
            setDraftFilters(prev => ({ ...prev, search: e.target.value }))
          }
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
          value={draftFilters.status}
          onChange={e =>
            setDraftFilters(prev => ({ ...prev, status: e.target.value }))
          }
          sx={{ minWidth: { sm: 200 } }}
        >
          {STATUS_OPTIONS.map(opt => (
            <MenuItem key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <AdminTableContainer
        loading={loading}
        error={error}
        count={count}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyMessage="Aucun jeu trouvé."
        header={header}
        snackbar={null}
        onSnackbarClose={() => {}}
      >
        {games.map(g => (
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
        ))}
      </AdminTableContainer>
    </Box>
  );
}
