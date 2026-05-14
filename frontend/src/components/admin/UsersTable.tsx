import {
  Alert,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useEffect, useState } from 'react';
import type { AdminUser } from '../../types/admin';
import { apiPost } from '../../services/api';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import SuspendUserModal from './SuspendUserModal';
import ErrorAlert from './ErrorAlert';

export default function UsersTable() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { users, error, refetch } = useAdminUsers(debouncedSearch);
  const filtered = users;

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

  if (error) return <ErrorAlert message={error} />;

  return (
    <Box>
      <TextField
        placeholder="Rechercher par pseudo ou email"
        size="small"
        fullWidth
        sx={{ mb: 3 }}
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

      <Box
        sx={{
          bgcolor: '#fff',
          border: '0.5px solid rgba(0,0,0,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 120px 100px 80px',
            px: 3,
            py: 1.5,
            bgcolor: '#f5f6fa',
            borderBottom: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {['Pseudo', 'Email', 'Rôles', 'Statut', 'Actions'].map(h => (
            <Typography
              key={h}
              variant="caption"
              sx={{
                fontWeight: 700,
                color: '#888',
                textTransform: 'uppercase',
                fontSize: 11,
              }}
            >
              {h}
            </Typography>
          ))}
        </Box>

        {filtered.length === 0 ? (
          <Typography sx={{ p: 3, color: '#888', fontSize: 14 }}>
            Aucun utilisateur trouvé.
          </Typography>
        ) : (
          filtered.map(user => (
            <Box
              key={user.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px 100px 80px',
                px: 3,
                py: 2,
                alignItems: 'center',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                '&:last-child': { borderBottom: 'none' },
                opacity: user.is_active ? 1 : 0.45,
                bgcolor: user.is_active ? 'transparent' : 'rgba(0,0,0,0.02)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user.pseudo ?? '—'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#555' }}>
                {user.email}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {user.is_superuser && (
                  <Chip
                    label="superuser"
                    size="small"
                    sx={{ fontSize: 10, bgcolor: '#FDE8E8', color: '#A32D2D' }}
                  />
                )}
                {user.roles.map(r => (
                  <Chip key={r} label={r} size="small" sx={{ fontSize: 10 }} />
                ))}
                {!user.is_superuser && user.roles.length === 0 && (
                  <Typography variant="caption" sx={{ color: '#aaa' }}>
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
          ))
        )}
      </Box>

      <SuspendUserModal
        user={selectedUser}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleSuspend}
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
