import Button, { type ButtonProps } from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import React from 'react';

const PrimaryButton: React.FC<ButtonProps> = props => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Button
      variant="contained"
      {...props}
      sx={{
        background: isDark
          ? 'linear-gradient(135deg, #FF3D3D 0%, #D32F2F 100%)'
          : 'linear-gradient(135deg, #FF3D3D 0%, #B71C1C 100%)',
        color: '#ffffff',
        borderRadius: 2,
        textTransform: 'none',
        px: 4,
        py: 1,
        fontWeight: 'bold',
        boxShadow: isDark
          ? '0 4px 12px rgba(255,61,61,0.3)'
          : '0 4px 12px rgba(255,61,61,0.2)',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: isDark
            ? 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)'
            : 'linear-gradient(135deg, #B71C1C 0%, #8B0000 100%)',
          boxShadow: isDark
            ? '0 6px 16px rgba(255,61,61,0.4)'
            : '0 6px 16px rgba(255,61,61,0.3)',
          transform: 'translateY(-2px)',
        },
        '&:disabled': {
          background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.26)',
        },
        ...props.sx,
      }}
    />
  );
};

export default PrimaryButton;
