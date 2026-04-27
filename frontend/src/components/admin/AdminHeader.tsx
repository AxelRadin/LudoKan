import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Box,
  Chip,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { apiPost } from '../../services/api';

export default function AdminHeader() {
  const { user, setAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout/', {});
    } finally {
      setAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  }

  const displayName = user?.pseudo ?? user?.username ?? 'Admin';
  const topRole = user?.is_superuser
    ? 'superuser'
    : (user?.roles[0] ?? 'moderator');

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        color: '#111',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: '#888', fontSize: 13 }}>
          Espace administrateur
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={topRole.toUpperCase()}
            size="small"
            sx={{
              fontSize: 11,
              fontWeight: 700,
              bgcolor: '#FDE8E8',
              color: '#A32D2D',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
            {displayName}
          </Typography>
          <IconButton size="small" onClick={handleLogout} title="Déconnexion">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
