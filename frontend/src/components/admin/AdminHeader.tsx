import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  AppBar,
  Avatar,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { apiPost } from '../../services/api';
import ThemeToggle from '../ThemeToggle';

type Props = Readonly<{
  showMenuButton?: boolean;
  onOpenMenu?: () => void;
}>;

function HeaderTitle({
  showMenuButton,
  onOpenMenu,
}: Readonly<{
  showMenuButton: boolean;
  onOpenMenu?: () => void;
}>) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      {showMenuButton ? (
        <Tooltip title="Ouvrir la navigation">
          <IconButton size="small" onClick={onOpenMenu}>
            <MenuIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: { xs: 15, md: 17 },
            lineHeight: 1.15,
          }}
        >
          Espace administrateur
        </Typography>

        <Typography
          variant="caption"
          sx={{
            display: { xs: 'none', sm: 'block' },
            color: 'text.secondary',
            fontSize: 11,
          }}
        >
          Gestion et modération de la plateforme
        </Typography>
      </Box>
    </Box>
  );
}

function UserProfile({
  displayName,
  topRole,
}: Readonly<{
  displayName: string;
  topRole: string;
}>) {
  return (
    <Box
      sx={{
        display: { xs: 'none', sm: 'flex' },
        alignItems: 'center',
        gap: 1,
        px: 1,
        py: 0.75,
        border: 1,
        borderColor: 'divider',
        borderRadius: 999,
        bgcolor: 'background.default',
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          fontSize: 12,
          fontWeight: 800,
          bgcolor: 'action.hover',
          color: 'text.primary',
        }}
      >
        {displayName.slice(0, 1).toUpperCase()}
      </Avatar>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.1,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: 10.5,
            lineHeight: 1,
            display: 'block',
            textTransform: 'capitalize',
          }}
        >
          {topRole}
        </Typography>
      </Box>
    </Box>
  );
}

function HeaderActions({
  displayName,
  topRole,
  isSuperuser,
  onLogoutClick,
}: Readonly<{
  displayName: string;
  topRole: string;
  isSuperuser: boolean;
  onLogoutClick: () => void;
}>) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      <UserProfile displayName={displayName} topRole={topRole} />

      <Chip
        icon={<ShieldOutlinedIcon />}
        label={topRole.toUpperCase()}
        size="small"
        color={isSuperuser ? 'error' : 'default'}
        variant="outlined"
        sx={{
          display: { xs: 'none', md: 'inline-flex' },
          fontSize: 10.5,
          fontWeight: 800,
          height: 26,
          '& .MuiChip-icon': { fontSize: 15 },
        }}
      />

      <ThemeToggle sx={{ width: 34, height: 34 }} />

      <Tooltip title="Déconnexion">
        <IconButton
          size="small"
          onClick={onLogoutClick}
          sx={{ width: 34, height: 34, border: 1, borderColor: 'divider' }}
        >
          <LogoutIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function LogoutDialog({
  open,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Déconnexion</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Voulez-vous vraiment vous déconnecter de l&apos;espace administrateur
          ?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          Déconnecter
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminHeader({
  showMenuButton = false,
  onOpenMenu,
}: Props) {
  const { user, setAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const displayName = user?.pseudo ?? user?.username ?? 'Admin';
  const topRole = user?.is_superuser
    ? 'superuser'
    : (user?.roles[0] ?? 'moderator');

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout/', {});
    } finally {
      setAuthenticated(false);
      setUser(null);
      navigate('/');
    }
  }

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
          zIndex: theme => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 58, md: 66 },
            px: { xs: 1.5, md: 3 },
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <HeaderTitle
            showMenuButton={showMenuButton}
            onOpenMenu={onOpenMenu}
          />

          <HeaderActions
            displayName={displayName}
            topRole={topRole}
            isSuperuser={!!user?.is_superuser}
            onLogoutClick={() => setLogoutOpen(true)}
          />
        </Toolbar>
      </AppBar>

      <LogoutDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  );
}
