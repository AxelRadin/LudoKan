import BarChartIcon from '@mui/icons-material/BarChart';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TuneIcon from '@mui/icons-material/Tune';
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
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Snackbar,
  Switch,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/useThemeMode';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { TOUR_KEYS } from '../hooks/useOnboarding';
import PasswordField from '../components/PasswordField';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
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

function parsePasswordErrors(raw: string, t: (key: string) => string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.old_password) {
      return t('settings.pwErrorWrongOld');
    }
    if (parsed.new_password2) {
      const msgs = Array.isArray(parsed.new_password2)
        ? parsed.new_password2
        : [parsed.new_password2];
      return msgs.join(' ');
    }
    if (parsed.new_password1) {
      const msgs = Array.isArray(parsed.new_password1)
        ? parsed.new_password1
        : [parsed.new_password1];
      return msgs.join(' ');
    }
  } catch {
    // not JSON
  }
  if (raw.includes('old_password') || raw.toLowerCase().includes('incorrect')) {
    return t('settings.pwErrorWrongOld');
  }
  return raw || t('settings.pwErrorGeneric');
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useThemeMode();
  const navigate = useNavigate();
  const { prefs, updatePrefs } = useCookieConsent();

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    isError: false,
  });

  const handlePwModalOpen = () => {
    setPwModalOpen(true);
    setOldPassword('');
    setNewPassword1('');
    setNewPassword2('');
    setPwError(null);
  };

  const handlePwModalClose = () => {
    setPwModalOpen(false);
    setPwError(null);
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
      handlePwModalClose();
      setSnackbar({
        open: true,
        message: t('settings.pwSuccess'),
        isError: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setPwError(parsePasswordErrors(msg, t));
    } finally {
      setPwLoading(false);
    }
  };

  const handleRestartTour = () => {
    Object.values(TOUR_KEYS).forEach(key => localStorage.removeItem(key));
    navigate('/', { state: { startTour: true } });
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 12, pb: 6 }}>
      <Typography
        variant="h5"
        fontWeight={600}
        sx={{ mb: 4, color: 'secondary.main' }}
      >
        {t('settings.title')}
      </Typography>

      {/* Apparence */}
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

      {/* Section Cookies */}
      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        {t('settings.cookiesSection')}
      </Typography>

      <Box sx={{ ...settingsListCardBaseSx, mt: 1, mb: 3 }}>
        <List disablePadding>
          <ListItem>
            <ListItemIcon
              sx={{
                color: prefs.analytics ? 'primary.main' : 'text.secondary',
              }}
            >
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText
              primary="Analytics"
              secondary={t('settings.analyticsDesc')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={prefs.analytics}
                onChange={e =>
                  updatePrefs({
                    analytics: e.target.checked,
                    personnalisation: prefs.personnalisation,
                  })
                }
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider variant="inset" component="li" />

          <ListItem>
            <ListItemIcon
              sx={{
                color: prefs.personnalisation
                  ? 'primary.main'
                  : 'text.secondary',
              }}
            >
              <TuneIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.personalisationLabel')}
              secondary={t('settings.personalisationDesc')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={prefs.personnalisation}
                onChange={e =>
                  updatePrefs({
                    analytics: prefs.analytics,
                    personnalisation: e.target.checked,
                  })
                }
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>

          <Divider variant="inset" component="li" />

          <ListItemButton
            onClick={() => {
              navigate('/cookies');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            sx={settingsListRowButtonSx}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <CookieOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary={t('settings.cookies')}
              secondary={t('settings.cookiesDetail')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>
        </List>
      </Box>

      {/* Aide */}
      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        {t('settings.helpSection')}
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
              primary={t('settings.restartTour')}
              secondary={t('settings.restartTourDesc')}
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>
        </List>
      </Box>

      {/* Informations */}
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
            <PasswordStrengthIndicator password={newPassword1} />
            <PasswordField
              label={t('settings.pwConfirmPassword')}
              variant="outlined"
              fullWidth
              value={newPassword2}
              onChange={e => setNewPassword2(e.target.value)}
              error={!!newPassword2 && newPassword1 !== newPassword2}
              helperText={
                newPassword2 && newPassword1 !== newPassword2
                  ? t('settings.pwErrorMismatch')
                  : undefined
              }
            />
            {pwError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {pwError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handlePwModalClose} sx={{ borderRadius: 2 }}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={pwLoading}
            sx={{ borderRadius: 2 }}
          >
            {pwLoading ? t('settings.pwSaving') : t('settings.pwSave')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.isError ? 'error' : 'success'}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
