import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';
import { GAME_PAGE_FONT } from './gamePageAppearance';

export function Sep() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        height: '1px',
        my: 2,
        background: isDark
          ? 'linear-gradient(to right, rgba(239,83,80,0.3), rgba(239,83,80,0.1), transparent)'
          : 'linear-gradient(to right, rgba(198,40,40,0.2), rgba(198,40,40,0.06), transparent)',
        borderRadius: 99,
      }}
    />
  );
}

type StatusChipProps = Readonly<{
  icon: React.ReactElement;
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}>;

export function StatusChip({
  icon,
  label,
  active,
  color,
  onClick,
}: StatusChipProps) {
  const borderColor = active ? color + '40' : 'rgba(0,0,0,0.06)';
  const border = '1px solid ' + borderColor;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.5,
        py: 0.7,
        borderRadius: '12px',
        cursor: 'pointer',
        background: active ? `${color}18` : 'rgba(0,0,0,0.03)',
        border,
        color: active ? color : '#b49393',
        transition: 'all 0.18s ease',
        '&:hover': {
          background: `${color}14`,
          borderColor: `${color}35`,
          color,
          transform: 'translateY(-1px)',
        },
      }}
    >
      {React.cloneElement(icon, {
        sx: { fontSize: 14, color: 'inherit' },
      } as never)}
      <Typography
        sx={{
          fontFamily: GAME_PAGE_FONT,
          fontSize: 12.5,
          fontWeight: active ? 700 : 500,
          color: 'inherit',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
