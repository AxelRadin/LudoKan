import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import React, { useMemo } from 'react';

interface CarouselArrowButtonProps {
  direction: 'left' | 'right';
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
  sx?: object;
}

export const CarouselArrowButton: React.FC<CarouselArrowButtonProps> = ({
  direction,
  onClick,
  ariaLabel,
  sx = {},
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const colors = useMemo(
    () => ({
      bg: isDark ? 'rgba(42,32,32,0.95)' : 'common.white',
      bgHover: isDark ? 'rgba(50,30,30,1)' : 'common.white',
      color: isDark ? '#f5e6e6' : 'text.primary',
      colorHover: isDark ? '#FF3D3D' : 'text.secondary',
      border: isDark ? 'rgba(74,48,48,0.6)' : 'grey.200',
      shadow: isDark
        ? '0 4px 14px rgba(0,0,0,0.4)'
        : '0 4px 14px rgba(0,0,0,0.12)',
      shadowHover: isDark
        ? '0 6px 18px rgba(255,61,61,0.3)'
        : '0 6px 18px rgba(0,0,0,0.18)',
    }),
    [isDark]
  );

  return (
    <IconButton
      aria-label={ariaLabel}
      onClick={onClick}
      sx={{
        position: 'absolute',
        [direction]: direction === 'left' ? 12 : 12, // Default to 12 as per RecommendedGamesSection
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
        width: 42,
        height: 42,
        bgcolor: colors.bg,
        backdropFilter: 'blur(12px)',
        color: colors.color,
        border: '1px solid',
        borderColor: colors.border,
        boxShadow: colors.shadow,
        transition: 'all 0.2s ease',
        '&:hover': {
          bgcolor: colors.bgHover,
          boxShadow: colors.shadowHover,
          transform: 'translateY(-50%) scale(1.05)',
          color: colors.colorHover,
          borderColor: isDark ? 'rgba(255,61,61,0.4)' : colors.border,
        },
        '&:active': { transform: 'translateY(-50%) scale(0.98)' },
        ...sx,
      }}
    >
      {direction === 'left' ? (
        <ChevronLeftIcon sx={{ fontSize: 24 }} />
      ) : (
        <ChevronRightIcon sx={{ fontSize: 24 }} />
      )}
    </IconButton>
  );
};
