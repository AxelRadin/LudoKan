import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import MenuIcon from '@mui/icons-material/Menu';
import { Button, Dialog, Drawer, useMediaQuery, useTheme } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import theme from '../theme';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';
import SecondaryButton from './SecondaryButton';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    setAuthenticated,
    isAuthModalOpen,
    setAuthModalOpen,
    pendingAction,
    setPendingAction,
  } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md')); // md is 900px

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
    try {
      await apiPost('/api/auth/logout/', {});
    } catch (e) {
      // On ignore l'erreur de logout pour l'UX, mais on peut logguer
      console.error('Erreur lors du logout', e);
    } finally {
      setAuthenticated(false);
      setDrawerOpen(false);
      navigate('/');
    }
  };

  const desktopActions = (
    <>
      <IconButton color="inherit">
        <LanguageIcon />
      </IconButton>
      {isAuthenticated ? (
        <>
          <Button color="inherit" href="/profile">
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Se déconnecter
          </Button>
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
            Profile
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
        sx={{
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          zIndex: theme.zIndex.appBar,
          width: '100%',
          overflow: 'visible',
        }}
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
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box display="flex" alignItems="center">
              <img
                src="/logo.png"
                alt="Ludokan Logo"
                style={{ height: 40, marginRight: 8 }}
              />
            </Box>
          </Link>

          {!isMobile && (
            <>
              <SearchBar />
              <Box display="flex" alignItems="center" gap={2}>
                {desktopActions}
              </Box>
            </>
          )}

          {isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon />
            </IconButton>
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
        <Box
          onClick={() => {
            // Need to allow SeachBar inputs, so don't close Drawer on pure Box clicks
          }}
        >
          <Box mb={4}>
            <SearchBar />
          </Box>
          {mobileActions}
        </Box>
      </Drawer>

      <Dialog open={isAuthModalOpen} onClose={handleAuthClose} keepMounted>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
          }}
        >
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
