import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from 'react';
import type { AdminUser } from '../../types/admin';
import { apiPost } from '../../services/api';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useAdminTableState } from '../../hooks/useAdminTableState';
import AdminTableContainer from './AdminTableContainer';
import SuspendUserModal from './SuspendUserModal';

export default function UsersTable() {
  const {
    filters: search,
    draftFilters: draftSearch,
    setDraftFilters: setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    snackbar,
    setSnackbar,
  } = useAdminTableState('', 300);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { users, count, loading, error, refetch } = useAdminUsers(
    search,
    page + 1,
    pageSize
  );

  async function handleSuspend(userId: number, reason: string) {
    try {
      await apiPost(`/api/admin/users/${userId}/suspend/`, { reason });
      refetch();
      setSnackbar({
        message: 'Le compte a bien été suspendu.',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        message: 'Erreur lors de la suspension du compte.',
        severity: 'error',
      });
    }
  }

  async function handleReactivate(userId: number) {
    try {
      await apiPost(`/api/admin/users/${userId}/reactivate/`, {});
      refetch();
      setSnackbar({
        message: 'Le compte a bien été réactivé.',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        message: 'Erreur lors de la réactivation du compte.',
        severity: 'error',
      });
    }
  }

  const gridCols = {
    xs: '1fr 1fr 90px 80px 64px',
    md: '1fr 1fr 120px 100px 80px',
  };

  const header = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        px: 3,
        py: 1.5,
        bgcolor: 'action.hover',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {['Pseudo', 'Email', 'Rôles', 'Statut', 'Actions'].map(h => (
        <Typography
          key={h}
          variant="caption"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            fontSize: 11,
          }}
        >
          {h}
        </Typography>
      ))}
    </Box>
  );

  return (
    <Box>
      <TextField
        placeholder="Rechercher par pseudo ou email"
        size="small"
        fullWidth
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'text.secondary',
          },
        }}
        inputProps={{ style: { color: 'inherit' } }}
        value={draftSearch}
        onChange={e => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <AdminTableContainer
        loading={loading}
        error={error}
        count={count}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyMessage="Aucun utilisateur trouvé."
        header={header}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar(null)}
      >
        {users.map(user => (
          <Box
            key={user.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              px: 3,
              py: 2,
              alignItems: 'center',
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-child': { borderBottom: 'none' },
              opacity: user.is_active ? 1 : 0.45,
              bgcolor: user.is_active ? 'transparent' : 'action.hover',
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: 'text.primary' }}
            >
              {user.pseudo ?? '—'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {user.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {user.is_superuser && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: 10,
                    fontWeight: 600,
                    bgcolor: 'error.dark',
                    color: 'common.white',
                  }}
                >
                  superadmin
                </Box>
              )}
              {user.roles.map(r => (
                <Chip key={r} label={r} size="small" sx={{ fontSize: 10 }} />
              ))}
              {!user.is_superuser && user.roles.length === 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  user
                </Typography>
              )}
            </Box>
            <Chip
              label={user.is_active ? 'Actif' : 'Suspendu'}
              size="small"
              color={user.is_active ? 'success' : 'error'}
              variant="outlined"
            />
            <Box>
              {user.is_active ? (
                <Tooltip title="Suspendre">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSelectedUser(user);
                      setModalOpen(true);
                    }}
                  >
                    <BlockIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Réactiver">
                  <IconButton
                    size="small"
                    color="success"
                    onClick={() => handleReactivate(user.id)}
                  >
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        ))}
      </AdminTableContainer>

      <SuspendUserModal
        user={selectedUser}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleSuspend}
      />
    </Box>
  );
}
