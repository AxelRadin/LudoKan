import BarChartIcon from '@mui/icons-material/BarChart';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined';
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

// --- Shared Styles ---
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

// --- Helper Functions ---
function parsePasswordErrors(raw: string, t: (key: string) => string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.old_password) return t('settings.pwErrorWrongOld');

    const extractMsg = (field: string | string[]) => Array.isArray(field) ? field.join(' ') : field;
    if (parsed.new_password2) return extractMsg(parsed.new_password2);
    if (parsed.new_password1) return extractMsg(parsed.new_password1);
  } catch {
    console.warn('Failed to parse password change error response:', raw);
  }
  if (raw.includes('old_password') || raw.toLowerCase().includes('incorrect')) {
    return t('settings.pwErrorWrongOld');
  }
  return raw || t('settings.pwErrorGeneric');
}

// --- Reusable UI Components ---
const SettingsSection: React.FC<{ title: string; children: React.ReactNode; isLast?: boolean }> = ({ title, children, isLast }) => (
  <>
    <Typography variant="overline" sx={settingsSectionHeadingSx}>{title}</Typography>
    <Box sx={{ ...settingsListCardBaseSx, mt: 1, mb: isLast ? 1 : 3 }}>
      <List disablePadding>{children}</List>
    </Box>
  </>
);

const ToggleListItem: React.FC<{
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  activeColor?: string;
}> = ({ icon, primary, secondary, checked, onChange, activeColor = 'primary.main' }) => (
  <ListItem>
    <ListItemIcon sx={{ color: checked ? activeColor : 'text.secondary' }}>{icon}</ListItemIcon>
    <ListItemText primary={primary} secondary={secondary} primaryTypographyProps={{ fontWeight: 500 }} />
    <ListItemSecondaryAction>
      <Switch checked={checked} onChange={onChange} color="primary" />
    </ListItemSecondaryAction>
  </ListItem>
);

const ActionListItem: React.FC<{
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
  onClick: () => void;
}> = ({ icon, primary, secondary, onClick }) => (
  <ListItemButton onClick={onClick} sx={settingsListRowButtonSx}>
    <ListItemIcon sx={{ color: 'text.secondary' }}>{icon}</ListItemIcon>
    <ListItemText primary={primary} secondary={secondary} primaryTypographyProps={{ fontWeight: 500 }} />
    <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
  </ListItemButton>
);

// --- Main Page Component ---
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', isError: false });

  const handleNavigate = (path: string) => {
    navigate(path);
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      return setPwError(t('settings.pwErrorFillFields'));
    }
    if (newPassword1.length < 8) {
      return setPwError(t('settings.pwErrorMinLength'));
    }
    if (newPassword1 !== newPassword2) {
      return setPwError(t('settings.pwErrorMismatch'));
    }

    try {
      setPwLoading(true);
      await apiPost('/api/auth/password/change/', {
        old_password: oldPassword,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      handlePwModalClose();
      setSnackbar({ open: true, message: t('settings.pwSuccess'), isError: false });
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
      <Typography variant="h5" fontWeight={600} sx={{ mb: 4, color: 'secondary.main' }}>
        {t('settings.title')}
      </Typography>

      {/* Apparence */}
      <SettingsSection title={t('settings.appearanceSection')}>
        <ToggleListItem
          icon={<DarkModeIcon />}
          primary={t('settings.darkMode')}
          secondary={t('settings.darkModeDesc')}
          checked={darkMode}
          onChange={toggleDarkMode}
        />
      </SettingsSection>

      {/* Section Sécurité */}
      <SettingsSection title={t('settings.securitySection')}>
        <ActionListItem
          icon={<LockOutlinedIcon />}
          primary={t('settings.changePassword')}
          secondary={t('settings.changePasswordDesc')}
          onClick={handlePwModalOpen}
        />
      </SettingsSection>

      {/* Section Cookies */}
      <SettingsSection title={t('settings.cookiesSection')}>
        <ToggleListItem
          icon={<BarChartIcon />}
          primary="Analytics"
          secondary={t('settings.analyticsDesc')}
          checked={prefs.analytics}
          onChange={e => updatePrefs({ ...prefs, analytics: e.target.checked })}
        />
        <Divider variant="inset" component="li" />
        <ToggleListItem
          icon={<TuneIcon />}
          primary={t('settings.personalisationLabel')}
          secondary={t('settings.personalisationDesc')}
          checked={prefs.personnalisation}
          onChange={e => updatePrefs({ ...prefs, personnalisation: e.target.checked })}
        />
        <Divider variant="inset" component="li" />
        <ActionListItem
          icon={<CookieOutlinedIcon />}
          primary={t('settings.cookies')}
          secondary={t('settings.cookiesDetail')}
          onClick={() => handleNavigate('/cookies')}
        />
      </SettingsSection>

      {/* Aide */}
      <SettingsSection title={t('settings.helpSection')}>
        <ActionListItem
          icon={<ContactSupportOutlinedIcon />}
          primary={t('settings.supportContact')}
          secondary={t('settings.supportContactDesc')}
          onClick={() => handleNavigate('/support')}
        />
        <Divider variant="inset" component="li" />
        <ActionListItem
          icon={<SchoolOutlinedIcon />}
          primary={t('settings.restartTour')}
          secondary={t('settings.restartTourDesc')}
          onClick={handleRestartTour}
        />
      </SettingsSection>

      {/* Informations */}
      <SettingsSection title={t('settings.infoSection')} isLast>
        <ActionListItem
          icon={<PolicyOutlinedIcon />}
          primary={t('settings.policies')}
          onClick={() => handleNavigate('/politiques')}
        />
        <Divider variant="inset" component="li" />
        <ActionListItem
          icon={<InfoOutlinedIcon />}
          primary={t('settings.about')}
          onClick={() => handleNavigate('/about')}
        />
      </SettingsSection>

      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 5, color: 'text.disabled' }}>
        {t('settings.version')}
      </Typography>

      {/* Modals & Snackbars */}
      <Dialog
        open={pwModalOpen}
        onClose={handlePwModalClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
          {t('settings.changePasswordTitle')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
              helperText={newPassword2 && newPassword1 !== newPassword2 ? t('settings.pwErrorMismatch') : undefined}
            />
            {pwError && <Alert severity="error" sx={{ borderRadius: 2 }}>{pwError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handlePwModalClose} sx={{ borderRadius: 2 }}>{t('common.cancel')}</Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={pwLoading} sx={{ borderRadius: 2 }}>
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