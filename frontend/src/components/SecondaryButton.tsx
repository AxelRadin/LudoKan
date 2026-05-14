import Button, { type ButtonProps } from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import React from 'react';

const SecondaryButton: React.FC<ButtonProps> = props => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Button
      variant="outlined"
      {...props}
      sx={{
        borderRadius: 2,
        borderWidth: 2,
        borderColor: isDark ? '#FF8A80' : '#FF3D3D',
        color: isDark ? '#FF8A80' : '#FF3D3D',
        fontWeight: 600,
        textTransform: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderWidth: 2,
          borderColor: isDark ? '#FF6B6B' : '#D32F2F',
          backgroundColor: isDark
            ? 'rgba(255,138,128,0.1)'
            : 'rgba(255,61,61,0.1)',
          color: isDark ? '#FF6B6B' : '#D32F2F',
          transform: 'translateY(-2px)',
        },
        '& .MuiTouchRipple-ripple .MuiTouchRipple-child': {
          borderRadius: 2,
          backgroundColor: 'rgba(255, 61, 61, 0.3)',
        },
        ...props.sx,
      }}
    />
  );
};

export default SecondaryButton;
