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
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
 
const SettingsPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
 
  const externalLinks = [
    {
      label: 'Cookies',
      icon: <CookieOutlinedIcon />,
      href: 'https://ludokan.fr/cookies',
    },
    {
      label: 'À propos',
      icon: <InfoOutlinedIcon />,
      href: 'https://ludokan.fr/a-propos',
    },
  ];
 
  return (
    <Container maxWidth="sm" sx={{ pt: 12, pb: 6 }}>
      <Typography variant="h5" fontWeight={600} sx={{ mb: 4, color: 'secondary.main' }}>
        Paramètres
      </Typography>
 
      {/* Section Apparence */}
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5, fontSize: 11 }}>
        Apparence
      </Typography>
 
      <Box sx={{ mt: 1, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <List disablePadding>
          <ListItem>
            <ListItemIcon sx={{ color: darkMode ? 'primary.main' : 'text.secondary' }}>
              <DarkModeIcon />
            </ListItemIcon>
            <ListItemText
              primary="Mode sombre"
              secondary="Changer l'apparence de l'application"
              primaryTypographyProps={{ fontWeight: 500 }}
            />
            <ListItemSecondaryAction>
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                color="primary"
              />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Box>
 
      {/* Section Informations */}
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5, fontSize: 11 }}>
        Informations
      </Typography>
 
      <Box sx={{ mt: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <List disablePadding>
 
          {/* Politiques — navigation interne */}
          <ListItemButton
            onClick={() => navigate('/politiques')}
            sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255, 100, 100, 0.06)' } }}
          >
            <ListItemIcon sx={{ color: 'text.secondary' }}>
              <PolicyOutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Politiques" primaryTypographyProps={{ fontWeight: 500 }} />
            <ChevronRightIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
          </ListItemButton>
 
          <Divider variant="inset" component="li" />
 
          {/* Liens externes */}
          {externalLinks.map((item, index) => (
            <React.Fragment key={item.label}>
              <ListItemButton
                component="a"
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255, 100, 100, 0.06)' } }}
              >
                <ListItemIcon sx={{ color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 500 }} />
                <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              </ListItemButton>
              {index < externalLinks.length - 1 && <Divider variant="inset" component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Box>
 
      <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 5, color: 'text.disabled' }}>
        Ludokan • v1.0.0
      </Typography>
    </Container>
  );
};
 
export default SettingsPage;