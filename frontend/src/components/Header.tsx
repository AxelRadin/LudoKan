import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';

import { Button, Dialog, Typography } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Toolbar
          sx={{ justifyContent: 'space-between', py: 1, px: 4, minHeight: 64 }}
        >
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #FF3D3D 0%, #FF8C42 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                userSelect: 'none',
              }}
            >
              LudoKan
            </Typography>
          </Link>

          <SearchBar />

          <Box display="flex" alignItems="center" gap={2}>
            {isAuthenticated ? (
              <>
                <Button href="/profile" sx={rippleSx}>
                  Profile
                </Button>
                <Button onClick={handleLogout} sx={rippleSx}>
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleLoginOpen} sx={rippleSx}>
                  Se connecter
                </Button>
                <SecondaryButton onClick={handleRegisterOpen}>
                  S'inscrire
                </SecondaryButton>
              </>
            )}

            <IconButton sx={rippleSx}>
              <LanguageIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

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
