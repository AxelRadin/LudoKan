import LanguageIcon from '@mui/icons-material/Language';
import CloseIcon from '@mui/icons-material/Close';
import { Button, Dialog } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';

import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';
import SecondaryButton from './SecondaryButton';
import theme from '../theme';

export const Header: React.FC = () => {
  const [openAuth, setOpenAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleLoginOpen = () => {
    setAuthMode('login');
    setOpenAuth(true);
  };

  const handleRegisterOpen = () => {
    setAuthMode('register');
    setOpenAuth(true);
  };

  const handleAuthClose = () => {
    setOpenAuth(false);
  };

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
        }}
      >
        <Toolbar
          sx={{ justifyContent: 'space-between', py: 1, px: 4, minHeight: 64 }}
        >
          <Box display="flex" alignItems="center">
            <img
              src="/logo.png"
              alt="Ludokan Logo"
              style={{ height: 40, marginRight: 8 }}
            />
            <Typography variant="h6" sx={{ fontFamily: 'Lobster, cursive' }}>
              Ludokan
            </Typography>
          </Box>

          <SearchBar />

          <Box display="flex" alignItems="center" gap={2}>
            <Button color="inherit" onClick={handleLoginOpen}>
              Se connecter
            </Button>

            <SecondaryButton onClick={handleRegisterOpen}>
              S’inscrire
            </SecondaryButton>

            <IconButton color="inherit">
              <LanguageIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Dialog open={openAuth} onClose={handleAuthClose} keepMounted>
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
          <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </Dialog>
    </>
  );
};

export default Header;
