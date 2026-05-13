import BarChartIcon from '@mui/icons-material/BarChart';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  Container,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Switch,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/useThemeMode';
import { useCookieConsent } from '../hooks/useCookieConsent';
import { TOUR_KEYS } from '../hooks/useOnboarding';

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
  const { prefs, updatePrefs } = useCookieConsent();

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

      {/* Section Apparence */}
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

      {/* Section Cookies */}
      <Typography variant="overline" sx={settingsSectionHeadingSx}>
        Cookies
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
              secondary="Mesure d'audience anonymisée (Sentry)"
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
              primary="Personnalisation"
              secondary="Thème, préférences, recommandations"
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
              secondary="Détail des cookies utilisés"
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

      {/* Section Informations */}
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
    </Container>
  );
};

export default SettingsPage;
