import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Typography,
  ListItemButton,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/useThemeMode';
import { TOUR_KEYS } from '../hooks/useOnboarding';
import PasswordField from '../components/PasswordField';
import { apiPost } from '../services/api';

const settingsSectionHeadingSx = {
  color: 'text.secondary',
  letterSpacing: 1.5,
  fontSize: 11,
} as const;

const settingsListCardBaseSx = {
  borderRadius: 3,
  border: '1px solid',
  borderColor: 'divider',
  overflow: 'hidden',
  bgcolor: 'background.paper',
} as const;

const settingsListRowButtonSx = {
  py: 1.5,
  '&:hover': { bgcolor: 'rgba(255, 100, 100, 0.06)' },
} as const;

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const navigate = useNavigate();

  // Change password modal state
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const handlePwModalOpen = () => {
    setPwModalOpen(true);
    setOldPassword('');
    setNewPassword1('');
    setNewPassword2('');
    setPwError(null);
    setPwSuccess(false);
  };

  const handlePwModalClose = () => {
    setPwModalOpen(false);
    setPwError(null);
    setPwSuccess(false);
  };

  const handleChangePassword = async () => {
    setPwError(null);

    if (!oldPassword || !newPassword1 || !newPassword2) {
      setPwError(t('settings.pwErrorFillFields'));
      return;
    }
    if (newPassword1.length < 8) {
      setPwError(t('settings.pwErrorMinLength'));
      return;
    }
    if (newPassword1 !== newPassword2) {
      setPwError(t('settings.pwErrorMismatch'));
      return;
    }

    try {
      setPwLoading(true);
      await apiPost('/api/auth/password/change/', {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      setPwSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('old_password') ||
        msg.toLowerCase().includes('ancien')
      ) {
        setPwError(t('settings.pwErrorWrongOld'));
      } else {
        setPwError(msg || t('settings.pwErrorGeneric'));
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleRestartTour = () => {
    Object.values(TOUR_KEYS).forEach(key => localStorage.removeItem(key));
    navigate('/', { state: { startTour: true } });
  };

  const externalLinks = [
    {
      label: t('settings.cookies'),
      icon: <CookieOutlinedIcon />,
      href: 'https://ludokan.fr/cookies',
    },
  ];

  return (
    <Container maxWidth="sm" sx={{ pt: 12, pb: 6 }}>
      <Typography
        variant="h5"
        fontWeight={600}
        sx={{ mb: 4, color: 'secondary.main' }}
      >
        {t('settings.title')}
      </Typography>

      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        {t('settings.appearanceSection')}
      </Typography>

      <Box sx={{ ...settingsListCardBaseSx, mt: 1, mb: 3 }}>
        <List disablePadding>
          <ListItem>
            <ListItemIcon
              sx={{ color: darkMode ? 'primary.main' : 'text.secondary' }}
            >
              <DarkModeIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.darkMode')}
              secondary={t('settings.darkModeDesc')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={darkMode}
                onChange={toggleDarkMode}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Box>

      {/* Section Sécurité */}
      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        {t('settings.securitySection')}
      </Typography>

      <Box sx={{ ...settingsListCardBaseSx, mt: 1, mb: 3 }}>
        <List disablePadding>
          <ListItemButton
            onClick={handlePwModalOpen}
            sx={settingsListRowButtonSx}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <LockOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.changePassword')}
              secondary={t('settings.changePasswordDesc')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>
        </List>
      </Box>

      {/* Section Aide */}
      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        Aide
      </Typography>

      <Box sx={{ ...settingsListCardBaseSx, mt: 1, mb: 3 }}>
        <List disablePadding>
          <ListItemButton
            onClick={handleRestartTour}
            sx={settingsListRowButtonSx}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <SchoolOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="Revoir le didacticiel"
              secondary="Relance le guide de prise en main"
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>
        </List>
      </Box>

      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        {t('settings.infoSection')}
      </Typography>

      <Box sx={{ ...settingsListCardBaseSx, mt: 1 }}>
        <List disablePadding>
          <ListItemButton
            onClick={() => {
              navigate('/politiques');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            sx={settingsListRowButtonSx}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <PolicyOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.policies')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>

          <Divider variant="inset" component="li" />

          <ListItemButton
            onClick={() => {
              navigate('/about');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            sx={settingsListRowButtonSx}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <InfoOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.about')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>

          <Divider variant="inset" component="li" />

          {externalLinks.map((item, index) => (
            <React.Fragment key={item.label}>
              <ListItemButton
                component="a"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={settingsListRowButtonSx}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </ListItemButton>
              {index < externalLinks.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>

      <Typography
        variant="caption"
        display="block"
        textAlign="center"
        sx={{ mt: 5, color: 'text.disabled' }}
      >
        {t('settings.version')}
      </Typography>

      {/* Modal Changer le mot de passe */}
      <Dialog
        open={pwModalOpen}
        onClose={handlePwModalClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
          {t('settings.changePasswordTitle')}
        </DialogTitle>
        <DialogContent>
          {pwSuccess ? (
            <Alert severity="success" sx={{ mt: 1, borderRadius: 2 }}>
              {t('settings.pwSuccess')}
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mt: 1,
              }}
            >
              <PasswordField
                label={t('settings.pwOldPassword')}
                variant="outlined"
                fullWidth
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                autoFocus
              />
              <PasswordField
                label={t('settings.pwNewPassword')}
                variant="outlined"
                fullWidth
                value={newPassword1}
                onChange={e => setNewPassword1(e.target.value)}
              />
              <PasswordField
                label={t('settings.pwConfirmPassword')}
                variant="outlined"
                fullWidth
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
              />
              {pwError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {pwError}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handlePwModalClose} sx={{ borderRadius: 2 }}>
            {pwSuccess ? t('common.close') : t('common.cancel')}
          </Button>
          {!pwSuccess && (
            <Button
              onClick={handleChangePassword}
              variant="contained"
              disabled={pwLoading}
              sx={{ borderRadius: 2 }}
            >
              {pwLoading ? t('settings.pwSaving') : t('settings.pwSave')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SettingsPage;
