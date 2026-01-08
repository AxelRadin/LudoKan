import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Button, Dialog, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
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
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);

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
    setProfileAnchor(null);
    try {
      await apiPost('/api/auth/logout/', {});
    } catch (e) {
      console.error('Erreur lors du logout', e);
    } finally {
      setAuthenticated(false);
      navigate('/');
    }
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchor(null);
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
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
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
          </Link>

          <SearchBar />

          <Box display="flex" alignItems="center" gap={2}>
            {isAuthenticated ? (
              <>
                {/* Bouton Profil avec menu déroulant */}
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
                    onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}
                  >
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Profil</ListItemText>
                  </MenuItem>

                  <MenuItem
                    onClick={() => { handleProfileMenuClose(); navigate('/settings'); }}
                  >
                    <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
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
                  S'inscrire
                </SecondaryButton>
              </>
            )}
            <IconButton color="inherit">
              <LanguageIcon />
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
