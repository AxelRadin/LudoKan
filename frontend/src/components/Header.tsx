import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

import { Button, Dialog } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/useAuth';
import { useColorMode } from '../contexts/ThemeContext';
import { apiPost } from '../services/api';

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';
import SecondaryButton from './SecondaryButton';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();

  const {
    isAuthenticated,
    setAuthenticated,
    isAuthModalOpen,
    setAuthModalOpen,
    pendingAction,
    setPendingAction,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLoginOpen = () => {
    setAuthMode('login');
    setAuthModalOpen(true);
  };

  const handleRegisterOpen = () => {
    setAuthMode('register');
    setAuthModalOpen(true);
  };

  const handleAuthClose = () => {
    setAuthModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await apiPost('/api/auth/logout/', {});
    } catch (e) {
      console.error('Erreur lors du logout', e);
    } finally {
      setAuthenticated(false);
      navigate('/');
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={2}
        sx={{
          backgroundColor: theme.palette.background.paper, // ✅ dynamique
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Toolbar
          sx={{ justifyContent: 'space-between', py: 1, px: 4, minHeight: 64 }}
        >
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box display="flex" alignItems="center">
              <img src="/logo.png" alt="Ludokan Logo" style={{ height: 75 }} />
            </Box>
          </Link>

          <SearchBar />

          <Box display="flex" alignItems="center" gap={2}>
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

            {/* 🌍 Langue */}
            <IconButton color="inherit">
              <LanguageIcon />
            </IconButton>

            {/* 🌙 Dark Mode */}
            <IconButton color="inherit" onClick={toggleColorMode}>
              {theme.palette.mode === 'dark' ? (
                <LightModeIcon />
              ) : (
                <DarkModeIcon />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
