import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { apiPost } from '../../services/api';

type Props = Readonly<{
  showMenuButton?: boolean;
  onOpenMenu?: () => void;
}>;

export default function AdminHeader({
  showMenuButton = false,
  onOpenMenu,
}: Props) {
  const { user, setAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

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
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 60, md: 64 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {showMenuButton ? (
              <IconButton
                size="small"
                onClick={onOpenMenu}
                sx={{ mr: 0.5 }}
                title="Ouvrir la navigation"
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            ) : null}
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: 13 }}
            >
              Espace administrateur
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={topRole.toUpperCase()}
              size="small"
              color="error"
              variant="outlined"
              sx={{
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 14 }}>
              {displayName}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setOpen(true)}
              title="Déconnexion"
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Déconnexion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment vous déconnecter de l&apos;espace
            administrateur ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleLogout} color="error" variant="contained">
            Déconnecter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
