import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Toolbar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import theme from '../theme';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';

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

  // Palette élégante qui met bien le rouge en valeur
  const bgMain = '#16181D'; // anthracite
  const bgSecondary = '#1F232B'; // gris foncé doux
  const textMain = '#F8F5F0'; // beige clair / ivoire
  const textSoft = '#D7D0C5'; // beige atténué
  const accentRed = '#C62828'; // rouge accent
  const borderSoft = 'rgba(255,255,255,0.08)';

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
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${bgMain}, ${bgSecondary})`,
          borderBottom: `1px solid ${borderSoft}`,
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            px: { xs: 2, md: 4 },
            py: 1.5,
            minHeight: 78,
            gap: 2,
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box
              display="flex"
              alignItems="center"
              sx={{
                transition: 'transform 0.25s ease',
                '&:hover': {
                  transform: 'scale(1.03)',
                },
              }}
            >
              <img
                src="/logo.png"
                alt="Ludokan Logo"
                style={{
                  height: 68,
                  objectFit: 'contain',
                }}
              />
            </Box>
          </Link>

          <Box
            sx={{
              flex: 1,
              maxWidth: 520,
              mx: 2,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box
              sx={{
                backgroundColor: alpha('#ffffff', 0.05),
                border: `1px solid ${alpha('#ffffff', 0.08)}`,
                borderRadius: '999px',
                px: 1,
                py: 0.5,
                backdropFilter: 'blur(8px)',
              }}
            >
              <SearchBar />
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1.2}>
            {isAuthenticated ? (
              <>
                <Button
                  component={Link}
                  to="/profile"
                  sx={{
                    color: textMain,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '999px',
                    px: 2.2,
                    py: 1,
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.05),
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: '20%',
                      right: '20%',
                      bottom: 6,
                      height: '2px',
                      backgroundColor: accentRed,
                      borderRadius: 10,
                      transform: 'scaleX(0)',
                      transition: 'transform 0.25s ease',
                    },
                    '&:hover::after': {
                      transform: 'scaleX(1)',
                    },
                  }}
                >
                  Profile
                </Button>

                <Button
                  onClick={handleLogout}
                  sx={{
                    color: textSoft,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '999px',
                    px: 2.2,
                    py: 1,
                    border: `1px solid ${alpha('#ffffff', 0.08)}`,
                    '&:hover': {
                      color: textMain,
                      backgroundColor: alpha('#ffffff', 0.05),
                      borderColor: alpha(accentRed, 0.45),
                    },
                  }}
                >
                  Se déconnecter
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleLoginOpen}
                  sx={{
                    color: textMain,
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '999px',
                    px: 2.2,
                    py: 1,
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.05),
                    },
                  }}
                >
                  Se connecter
                </Button>

                <Button
                  onClick={handleRegisterOpen}
                  sx={{
                    backgroundColor: textMain,
                    color: bgMain,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '999px',
                    px: 2.5,
                    py: 1,
                    boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
                    '&:hover': {
                      backgroundColor: '#ffffff',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  S’inscrire
                </Button>
              </>
            )}

            <IconButton
              sx={{
                color: textMain,
                backgroundColor: alpha('#ffffff', 0.05),
                border: `1px solid ${alpha('#ffffff', 0.08)}`,
                '&:hover': {
                  backgroundColor: alpha(accentRed, 0.18),
                  color: '#fff',
                },
              }}
            >
              <LanguageIcon />
            </IconButton>
          </Box>
        </Toolbar>

        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            px: 2,
            pb: 1.5,
          }}
        >
          <Box
            sx={{
              backgroundColor: alpha('#ffffff', 0.05),
              border: `1px solid ${alpha('#ffffff', 0.08)}`,
              borderRadius: '999px',
              px: 1,
              py: 0.5,
            }}
          >
            <SearchBar />
          </Box>
        </Box>
      </AppBar>

      <Dialog
        open={isAuthModalOpen}
        onClose={handleAuthClose}
        keepMounted
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            backgroundColor: '#fff',
          },
        }}
      >
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
