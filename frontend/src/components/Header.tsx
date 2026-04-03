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
import { keyframes } from '@mui/system';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import theme from '../theme';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';

const shimmer = keyframes`
  0% { transform: translateX(-120%); }
  100% { transform: translateX(220%); }
`;

const floatLogo = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0px); }
`;

const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

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

  const accent = '#C94C4C';
  const accentDark = '#A63D3D';
  const softRose = '#FCEEEE';
  const softCream = '#FFF8F4';
  const textMain = '#3A2E2E';
  const textSoft = '#7A6666';

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
          background: `linear-gradient(135deg, rgba(255,248,244,0.88), rgba(255,255,255,0.80), rgba(252,238,238,0.88))`,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${alpha(accent, 0.14)}`,
          boxShadow: '0 10px 30px rgba(201, 76, 76, 0.08)',
          zIndex: theme.zIndex.appBar,
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: '3px',
            background: `linear-gradient(90deg, ${alpha(accent, 0.15)}, ${accent}, ${alpha('#f6b7b7', 0.8)}, ${accentDark})`,
            backgroundSize: '200% 200%',
            animation: `${gradientFlow} 8s ease infinite`,
          },
        }}
      >
        <Toolbar
          sx={{
            justifyContent: 'space-between',
            py: 1.2,
            px: { xs: 2, md: 4 },
            minHeight: 78,
            gap: 2,
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box
              display="flex"
              alignItems="center"
              sx={{
                animation: `${floatLogo} 3.6s ease-in-out infinite`,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.04)',
                },
              }}
            >
              <img
                src="/logo.png"
                alt="Ludokan Logo"
                style={{
                  height: 70,
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 18px rgba(201,76,76,0.16))',
                }}
              />
            </Box>
          </Link>

          <Box
            sx={{
              flex: 1,
              maxWidth: 540,
              mx: 2,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box
              sx={{
                background: 'rgba(255,255,255,0.58)',
                border: `1px solid ${alpha(accent, 0.12)}`,
                borderRadius: '999px',
                px: 1,
                py: 0.5,
                boxShadow: '0 8px 18px rgba(0,0,0,0.03)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 12px 24px ${alpha(accent, 0.1)}`,
                  borderColor: alpha(accent, 0.22),
                },
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
                    px: 2.4,
                    py: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(accent, 0.08),
                      color: accentDark,
                      transform: 'translateY(-2px)',
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: '22%',
                      right: '22%',
                      bottom: 8,
                      height: '2px',
                      borderRadius: 8,
                      backgroundColor: accent,
                      transform: 'scaleX(0)',
                      transformOrigin: 'center',
                      transition: 'transform 0.3s ease',
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
                    px: 2.4,
                    py: 1,
                    background: 'rgba(255,255,255,0.55)',
                    border: `1px solid ${alpha(accent, 0.12)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      color: accentDark,
                      backgroundColor: alpha(accent, 0.08),
                      transform: 'translateY(-2px)',
                      boxShadow: `0 10px 18px ${alpha(accent, 0.12)}`,
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
                    px: 2.4,
                    py: 1,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: alpha(accent, 0.08),
                      color: accentDark,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Se connecter
                </Button>

                <Button
                  onClick={handleRegisterOpen}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                    color: '#fff',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '999px',
                    px: 2.8,
                    py: 1.1,
                    boxShadow: `0 12px 24px ${alpha(accent, 0.22)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px) scale(1.01)',
                      boxShadow: `0 16px 28px ${alpha(accent, 0.28)}`,
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '35%',
                      height: '100%',
                      background:
                        'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                      animation: `${shimmer} 2.8s infinite`,
                    },
                  }}
                >
                  S’inscrire
                </Button>
              </>
            )}

            <IconButton
              sx={{
                color: accentDark,
                background: 'rgba(255,255,255,0.55)',
                border: `1px solid ${alpha(accent, 0.12)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px) rotate(8deg)',
                  backgroundColor: softRose,
                  boxShadow: `0 10px 20px ${alpha(accent, 0.12)}`,
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
              background: 'rgba(255,255,255,0.58)',
              border: `1px solid ${alpha(accent, 0.12)}`,
              borderRadius: '999px',
              px: 1,
              py: 0.5,
              boxShadow: '0 8px 18px rgba(0,0,0,0.03)',
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
            borderRadius: 5,
            overflow: 'hidden',
            background: `linear-gradient(180deg, #ffffff, ${softCream})`,
            boxShadow: `0 24px 50px ${alpha(accent, 0.18)}`,
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
          <IconButton
            onClick={handleAuthClose}
            sx={{
              color: accentDark,
              backgroundColor: alpha(accent, 0.08),
              '&:hover': {
                backgroundColor: alpha(accent, 0.14),
                transform: 'rotate(90deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
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
