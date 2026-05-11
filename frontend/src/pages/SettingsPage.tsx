import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Container,
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
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/useThemeMode';

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
    </Container>
  );
};

export default SettingsPage;
