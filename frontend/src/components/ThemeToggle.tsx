import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { IconButton, Tooltip, SxProps, Theme } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '../contexts/useThemeMode';

const rippleSx: SxProps<Theme> = {
  color: 'inherit',
  '& .MuiTouchRipple-root': { color: '#FF3D3D !important' },
};

export const ThemeToggle: React.FC<{ sx?: SxProps<Theme> }> = ({ sx }) => {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode } = useThemeMode();

  return (
    <Tooltip title={darkMode ? t('header.lightMode') : t('header.darkMode')}>
      <IconButton
        onClick={toggleDarkMode}
        sx={{
          background: darkMode
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: darkMode
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0, 0, 0, 0.08)',
            transform: 'scale(1.05)',
          },
          ...rippleSx,
          ...sx,
        }}
      >
        {darkMode ? (
          <LightModeIcon
            sx={{ color: '#FBBF24', fontSize: { xs: 20, md: 24 } }}
          />
        ) : (
          <DarkModeIcon
            sx={{ color: '#5B21B6', fontSize: { xs: 20, md: 24 } }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
