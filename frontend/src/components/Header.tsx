import CloseIcon from '@mui/icons-material/Close';
import ExploreIcon from '@mui/icons-material/Explore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  Avatar,
  Button,
  Dialog,
  Divider,
  Drawer,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useThemeMode } from '../contexts/useThemeMode';
import { apiPatch, apiPost } from '../services/api';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import SearchBar from './SearchBar';
import SecondaryButton from './SecondaryButton';
import ThemeToggle from './ThemeToggle';
import NotificationIcon from './notifications/NotificationIcon';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
  { code: 'en', label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
];

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// --- Sub-components to reduce Cognitive Complexity ---

const LanguageDropdown: React.FC<{
  isAuthenticated: boolean;
}> = ({ isAuthenticated }) => {
  const { t, i18n } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const currentLang =
    LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setAnchor(null);
    if (isAuthenticated) {
      apiPatch('/api/auth/user/', { language_preference: code }).catch(
        () => {}
      );
    }
  };

  return (
    <>
      <Tooltip title={t('header.changeLanguage', 'Changer de langue')}>
        <IconButton
          color="inherit"
          onClick={e => setAnchor(e.currentTarget)}
          sx={{ gap: 0.5 }}
        >
          <img
            src={currentLang.flag}
            alt={currentLang.code}
            style={{
              width: 20,
              height: 14,
              objectFit: 'cover',
              borderRadius: 2,
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {currentLang.code.toUpperCase()}
          </Typography>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        PaperProps={{ sx: { borderRadius: '12px', minWidth: 150, mt: 0.5 } }}
      >
        {LANGUAGES.map(lang => (
          <MenuItem
            key={lang.code}
            onClick={() => handleSelect(lang.code)}
            selected={i18n.language === lang.code}
            sx={{
              fontWeight: i18n.language === lang.code ? 700 : 400,
              gap: 1.5,
              borderRadius: '8px',
              mx: 0.5,
              fontSize: 14,
            }}
          >
            <img
              src={lang.flag}
              alt={lang.code}
              style={{
                width: 24,
                height: 16,
                objectFit: 'cover',
                borderRadius: 2,
              }}
            />
            {lang.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

const UserMenu: React.FC<{ user: any; onLogout: () => void }> = ({
  user,
  onLogout,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { darkMode } = useThemeMode();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const handleNav = (path: string) => {
    setAnchor(null);
    navigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Button
        color="inherit"
        onClick={e => setAnchor(e.currentTarget)}
        endIcon={
          <KeyboardArrowDownIcon
            sx={{
              transition: 'transform 0.2s',
              transform: anchor ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        }
        sx={{
          background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          borderRadius: '16px',
          px: 1.5,
          py: 0.75,
          fontWeight: 700,
          textTransform: 'none',
          gap: 1,
        }}
      >
        <Avatar
          sx={{
            width: 28,
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 800,
            bgcolor: darkMode ? 'primary.dark' : 'primary.main',
            color: '#fff',
          }}
        >
          {getInitials(user?.pseudo || user?.username)}
        </Avatar>
        <Typography variant="body2" sx={{ fontWeight: 800, color: 'inherit' }}>
          {t('common.menu', 'Menu')}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            elevation: 3,
            sx: { mt: 1, minWidth: 180, borderRadius: 2 },
          },
        }}
      >
        <MenuItem onClick={() => handleNav('/profile')}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('nav.profile', 'Profil')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNav('/friends')}>
          <ListItemIcon>
            <PersonSearchIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('nav.friends', 'Amis')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleNav('/settings')}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('nav.settings', 'Paramètres')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={onLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>{t('nav.logout', 'Déconnexion')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

// --- Header Sections to reduce Cognitive Complexity ---

const LogoSection: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'flex-start',
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
          alt="Logo Ludokan"
          sx={{ height: 44, width: 44, borderRadius: '50%' }}
        />
        {!isMobile && (
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 20,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Ludokan
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const SearchSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      <SearchBar />
      <Tooltip title={t('header.exploreGames', 'Explorer les jeux')}>
        <Button
          color="inherit"
          onClick={() => navigate('/games')}
          startIcon={<ExploreIcon />}
          sx={{ fontWeight: 800, borderRadius: '12px', px: 2 }}
        >
          {t('nav.games', 'Jeux')}
        </Button>
      </Tooltip>
    </Box>
  );
};

interface DesktopActionsProps {
  isAuthenticated: boolean;
  user: any;
  handleLogout: () => void;
  handleAuthOpen: (mode: 'login' | 'register') => void;
}

const DesktopActions: React.FC<DesktopActionsProps> = ({
  isAuthenticated,
  user,
  handleLogout,
  handleAuthOpen,
}) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <ThemeToggle />
      <LanguageDropdown isAuthenticated={isAuthenticated} />
      {isAuthenticated ? (
        <>
          <NotificationIcon />
          <UserMenu user={user} onLogout={handleLogout} />
        </>
      ) : (
        <>
          <Button color="inherit" onClick={() => handleAuthOpen('login')}>
            {t('nav.login', 'Connexion')}
          </Button>
          <SecondaryButton onClick={() => handleAuthOpen('register')}>
            {t('nav.register', "S'inscrire")}
          </SecondaryButton>
        </>
      )}
    </Box>
  );
};

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { darkMode, setDarkMode } = useThemeMode();
  const {
    isAuthenticated,
    setAuthenticated,
    isAuthModalOpen,
    setAuthModalOpen,
    pendingAction,
    setPendingAction,
    authMode,
    setAuthMode,
    user,
  } = useAuth();

  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const handleLogout = async () => {
    try {
      await apiPost('/api/auth/logout/', {});
    } catch (e) {
      console.error(e);
    } finally {
      setAuthenticated(false);
      setDarkMode(false);
      setDrawerOpen(false);
      navigate('/');
    }
  };

  const handleAuthOpen = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
    setDrawerOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          px: { xs: 0.5, md: 1 },
          pt: 0.5,
        }}
      >
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{
            borderRadius: { xs: '20px', md: '24px' },
            backdropFilter: 'blur(20px)',
            background: darkMode
              ? 'rgba(26,16,16,0.85)'
              : 'rgba(255,255,255,0.85)',
            transition: 'all 0.3s ease',
          }}
        >
          <Toolbar
            sx={{
              justifyContent: 'space-between',
              py: 1,
              px: { xs: 2, md: 3 },
              minHeight: 64,
            }}
          >
            <LogoSection isMobile={isMobile} />

            {!isMobile && <SearchSection />}

            {isMobile ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ThemeToggle sx={{ width: 36, height: 36 }} />
                <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
                  <MenuIcon />
                </IconButton>
              </Box>
            ) : (
              <DesktopActions
                isAuthenticated={isAuthenticated}
                user={user}
                handleLogout={handleLogout}
                handleAuthOpen={handleAuthOpen}
              />
            )}
          </Toolbar>
        </AppBar>
      </Box>

      <Box sx={{ height: { xs: 66, md: 68 } }} />

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: '80%', maxWidth: 360, p: 3 } }}
      >
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <SearchBar />
        <Box display="flex" flexDirection="column" gap={2} mt={3}>
          {isAuthenticated ? (
            <>
              <NotificationIcon mobile />
              <Button
                variant="outlined"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/profile');
                }}
              >
                {t('nav.profile', 'Profil')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/friends');
                }}
              >
                {t('nav.friends', 'Amis')}
              </Button>
              <Button variant="contained" color="error" onClick={handleLogout}>
                {t('nav.logout', 'Déconnexion')}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => handleAuthOpen('login')}
              >
                {t('nav.login', 'Connexion')}
              </Button>
              <Button
                variant="contained"
                onClick={() => handleAuthOpen('register')}
              >
                {t('nav.register', "S'inscrire")}
              </Button>
            </>
          )}
          <Divider sx={{ my: 1 }} />
          <Button
            variant="outlined"
            onClick={() => {
              setDrawerOpen(false);
              navigate('/games');
            }}
            startIcon={<ExploreIcon />}
          >
            {t('nav.games', 'Jeux')}
          </Button>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={1}
          >
            <Typography variant="body2">
              {darkMode
                ? t('header.darkMode', 'Mode sombre')
                : t('header.lightMode', 'Mode clair')}
            </Typography>
            <ThemeToggle />
          </Box>
          <LanguageDropdown isAuthenticated={isAuthenticated} />
        </Box>
      </Drawer>

      {/* AUTH DIALOG */}
      <Dialog open={isAuthModalOpen} onClose={() => setAuthModalOpen(false)}>
        <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
          <IconButton onClick={() => setAuthModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        {authMode === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => setAuthMode('register')}
            onLoginSuccess={() => {
              setAuthenticated(true);
              setAuthModalOpen(false);
              pendingAction?.();
              setPendingAction(null);
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
