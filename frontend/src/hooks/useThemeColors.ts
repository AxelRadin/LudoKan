import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';

export function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(
    () => ({
      pageBg: isDark ? '#1a1010' : '#ffd3d3',
      shellBg: isDark ? '#2a2020' : '#fff7f7',
      cardBg: isDark ? 'rgba(42,32,32,0.72)' : 'rgba(255,255,255,0.72)',
      border: isDark ? '#4a3030' : '#f1c7c7',
      softBorder: isDark ? 'rgba(74,48,48,0.5)' : 'rgba(241,199,199,0.5)',
      title: isDark ? '#f5e6e6' : '#0f0f0f',
      text: isDark ? '#e0d0d0' : '#2b2b2b',
      muted: isDark ? '#9e7070' : '#6e6e73',
      light: isDark ? '#b49393' : '#a0a0a8',
      accent: '#FF3D3D',
      accentDark: '#b71c1c',
      accentGlow: isDark ? 'rgba(255,61,61,0.25)' : 'rgba(211,47,47,0.15)',
      glass: isDark ? 'rgba(42,32,32,0.78)' : 'rgba(255,250,250,0.78)',
      glassBorder: isDark ? 'rgba(74,48,48,0.9)' : 'rgba(255,255,255,0.9)',
      dialogBg: isDark ? 'rgba(42,32,32,0.96)' : 'rgba(255,249,249,0.96)',
    }),
    [isDark]
  );
}
