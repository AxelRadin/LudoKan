import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import {
  Button,
  Dialog,
  Divider,
  Drawer,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';
import SecondaryButton from './SecondaryButton';

const rippleSx = {
  color: 'inherit',
  '& .MuiTouchRipple-root': { color: '#FF3D3D !important' },
} as const;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isProfilePage = location.pathname === '/profile';

  const {
    isAuthenticated,
    setAuthenticated,
    isAuthModalOpen,
    setAuthModalOpen,
    pendingAction,
    setPendingAction,
    authMode,
    setAuthMode,
  } = useAuth();

  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleLoginOpen = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
    setDrawerOpen(false);
  };

  const handleRegisterOpen = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
    setDrawerOpen(false);
  };

  const handleAuthClose = () => {
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    setProfileAnchor(null);
    try {
      await apiPost('/api/auth/logout/', {});
    } catch (e) {
      console.error('Erreur lors du logout', e);
    } finally {
      setAuthenticated(false);
      setDrawerOpen(false);
      navigate('/');
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchor(null);
  };

  const desktopActions = (
    <>
      <IconButton color="inherit" sx={rippleSx}>
        <LanguageIcon />
      </IconButton>

      {isAuthenticated ? (
        <>
          <Button
            color="inherit"
            onClick={handleProfileMenuOpen}
            endIcon={
              <KeyboardArrowDownIcon
                sx={{
                  transition: 'transform 0.2s',
                  transform: profileAnchor ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            }
          >
            Profil
          </Button>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                elevation: 3,
                sx: {
                  mt: 1,
                  minWidth: 180,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                navigate('/profile');
              }}
            >
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profil</ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleProfileMenuClose();
                navigate('/settings');
              }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Paramètres</ListItemText>
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              </ListItemIcon>
              <ListItemText>Se déconnecter</ListItemText>
            </MenuItem>
          </Menu>
        </>
      ) : (
        <>
          <Button color="inherit" onClick={handleLoginOpen}>
            Se connecter
          </Button>
          <SecondaryButton onClick={handleRegisterOpen}>
            S’inscrire
          </SecondaryButton>
        </>
      )}
    </>
  );

  const mobileActions = (
    <Box display="flex" flexDirection="column" gap={2} mt={3}>
      {isAuthenticated ? (
        <>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setDrawerOpen(false);
              navigate('/profile');
            }}
          >
            Profil
          </Button>

          <Button
            variant="outlined"
            fullWidth
            onClick={() => {
              setDrawerOpen(false);
              navigate('/settings');
            }}
          >
            Paramètres
          </Button>

          <Button
            variant="contained"
            color="error"
            fullWidth
            onClick={handleLogout}
          >
            Se déconnecter
          </Button>
        </>
      ) : (
        <>
          <Button variant="outlined" fullWidth onClick={handleLoginOpen}>
            Se connecter
          </Button>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleRegisterOpen}
          >
            S’inscrire
          </Button>
        </>
      )}

      <Button startIcon={<LanguageIcon />} fullWidth variant="text">
        Langue
      </Button>
    </Box>
  );

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={2}
        sx={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            py: 1,
            px: { xs: 2, md: 4 },
            minHeight: 64,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Box
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              cursor: 'pointer',
            }}
          >
            <Box
              component="img"
              src="/logo.png"
              alt="Ludokan"
              sx={{
                height: 44,
                width: 44,
                objectFit: 'contain',
                borderRadius: '50%',
                display: 'block',
              }}
            />
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: '-0.5px',
                color: 'inherit',
                userSelect: 'none',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              Ludokan
            </Typography>
          </Box>

          {isMobile ? (
            <IconButton
              color="inherit"
              edge="end"
              onClick={() => setDrawerOpen(true)}
              aria-label="ouvrir le menu"
              sx={rippleSx}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              <SearchBar />
              <Box display="flex" alignItems="center" gap={2}>
                {desktopActions}
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: '80%', maxWidth: 360, p: 3, boxSizing: 'border-box' },
        }}
      >
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box>
          <Box mb={4}>
            <SearchBar />
          </Box>
          {mobileActions}
        </Box>
      </Drawer>

      <Dialog open={isAuthModalOpen} onClose={handleAuthClose} keepMounted>
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <IconButton onClick={handleAuthClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {authMode === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setAuthMode('register')}
            onLoginSuccess={() => {
              setAuthenticated(true);
              setAuthModalOpen(false);
              if (pendingAction) {
                pendingAction();
                setPendingAction(null);
              }
            }}
          />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </Dialog>
    </>
  );
};

export default Header;