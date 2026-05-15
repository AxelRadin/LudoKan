import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import {
  defaultAdminRatingsFilters,
  useAdminRatings,
} from '../../hooks/useAdminRatings';
import { useAdminTableState } from '../../hooks/useAdminTableState';
import { apiDelete } from '../../services/api';
import type { AdminRatingRow } from '../../types/adminReviews';
import { hasPermission } from '../../utils/adminPermissions';
import AdminTableContainer from './AdminTableContainer';
import DeleteGameModal from './DeleteGameModal';
import GameUserMultiAutocompleteFilters from './GameUserMultiAutocompleteFilters';

const cellTextSx = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  width: '100%',
} as const;

export default function AdminRatingsTable() {
  const { user } = useAuth();
  const canDelete = hasPermission(user, 'rating_delete');

  const {
    filters,
    draftFilters,
    setDraftFilters,
    resetFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    snackbar,
    setSnackbar,
  } = useAdminTableState(defaultAdminRatingsFilters);

  const { ratings, count, loading, error, refetch } = useAdminRatings(
    filters,
    page + 1,
    pageSize
  );

  const [deleteRow, setDeleteRow] = useState<AdminRatingRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const gridCols = {
    xs: 'minmax(0,1fr) 48px',
    sm: 'minmax(0,1fr) minmax(0,100px) minmax(0,100px) 80px 56px 48px',
  } as const;

  const header = (
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
  );

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
            onClick={resetFilters}
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

      <AdminTableContainer
        loading={loading}
        error={error}
        count={count}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyMessage="Aucune note trouvée."
        header={header}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar(null)}
      >
        {ratings.map(row => (
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
        ))}
      </AdminTableContainer>

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
    </Box>
  );
}
