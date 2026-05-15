import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Box,
  CircularProgress,
  IconButton,
  Snackbar,
  TablePagination,
  Tooltip,
  Typography,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import {
  defaultAdminRatingsFilters,
  useAdminRatings,
  type AdminRatingsFilters,
} from '../../hooks/useAdminRatings';
import { apiDelete } from '../../services/api';
import type { AdminRatingRow } from '../../types/adminReviews';
import { hasPermission } from '../../utils/adminPermissions';
import DeleteGameModal from './DeleteGameModal';
import ErrorAlert from './ErrorAlert';
import GameUserMultiAutocompleteFilters from './GameUserMultiAutocompleteFilters';
import LoadingSkeleton from './LoadingSkeleton';

const cellTextSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
} as const;

export default function AdminRatingsTable() {
  const { user } = useAuth();
  const canDelete = hasPermission(user, 'rating_delete');

  const [filters, setFilters] = useState<AdminRatingsFilters>(
    defaultAdminRatingsFilters
  );
  const [draftFilters, setDraftFilters] = useState<AdminRatingsFilters>(
    defaultAdminRatingsFilters
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setFilters(draftFilters), 350);
    return () => clearTimeout(t);
  }, [draftFilters]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const { ratings, count, loading, error, refetch } = useAdminRatings(
    filters,
    page + 1,
    pageSize
  );

  const [deleteRow, setDeleteRow] = useState<AdminRatingRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  async function handleDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/ratings/${deleteRow.id}/`);
      setSnackbar({ message: 'Note supprimée.', severity: 'success' });
      setDeleteRow(null);
      refetch();
    } catch (e) {
      setSnackbar({
        message: e instanceof Error ? e.message : 'Erreur à la suppression',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  if (error) return <ErrorAlert message={error} />;

  const gridCols = {
    xs: 'minmax(0,1fr) 48px',
    sm: 'minmax(0,1fr) minmax(0,100px) minmax(0,100px) 80px 56px 48px',
  } as const;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
          mb: 3,
          alignItems: 'start',
        }}
      >
        <GameUserMultiAutocompleteFilters
          gamesValue={draftFilters.games}
          onGamesChange={next =>
            setDraftFilters(prev => ({ ...prev, games: next }))
          }
          usersValue={draftFilters.users}
          onUsersChange={next =>
            setDraftFilters(prev => ({ ...prev, users: next }))
          }
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Typography
            component="button"
            type="button"
            variant="body2"
            onClick={() => {
              const reset = { ...defaultAdminRatingsFilters };
              setDraftFilters(reset);
              setFilters(reset);
            }}
            sx={{
              border: 0,
              bgcolor: 'transparent',
              cursor: 'pointer',
              textDecoration: 'underline',
              color: 'primary.main',
            }}
          >
            Réinitialiser filtres
          </Typography>
        </Box>
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
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Jeu
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: 11,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Utilisateur
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: 11,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Type
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: 11,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Valeur
          </Typography>
          <span />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: 11,
              textAlign: 'right',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Actions
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ p: 3 }}>
            <LoadingSkeleton variant="table" count={5} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={28} />
            </Box>
          </Box>
        ) : ratings.length === 0 ? (
          <Typography sx={{ p: 3, color: 'text.secondary', fontSize: 14 }}>
            Aucune note trouvée.
          </Typography>
        ) : (
          ratings.map(row => (
            <Box
              key={row.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                columnGap: 1,
                px: 2,
                py: 1.5,
                alignItems: 'center',
                borderBottom: 1,
                borderColor: 'divider',
                minWidth: 0,
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              <Typography
                variant="body2"
                sx={{ ...cellTextSx }}
                title={row.game_name}
              >
                {row.game_name}
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, ...cellTextSx }}
                title={row.user_pseudo}
              >
                {row.user_pseudo}
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: { xs: 'none', sm: 'block' }, ...cellTextSx }}
              >
                {row.rating_type}
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}
              >
                {row.value}
              </Typography>
              <Box />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {canDelete ? (
                  <Tooltip title="Supprimer la note">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteRow(row)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            </Box>
          ))
        )}
      </Box>

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Par page :"
        sx={{ mt: 1, width: '100%', maxWidth: '100%', overflow: 'auto' }}
      />

      <DeleteGameModal
        open={!!deleteRow}
        gameName={deleteRow ? `Note #${deleteRow.id}` : ''}
        dialogTitle="Supprimer cette note"
        warningText={
          deleteRow
            ? `Confirmer la suppression définitive de la note #${deleteRow.id} (${deleteRow.game_name}) ? Irréversible.`
            : undefined
        }
        loading={deleting}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
