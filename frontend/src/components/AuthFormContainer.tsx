import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import React from 'react';

type AuthFormContainerProps = {
  children: React.ReactNode;
  title: string;
  switchLabel: string;
  onSwitch: () => void;
};

const AuthFormContainer: React.FC<AuthFormContainerProps> = ({
  children,
  title,
  switchLabel,
  onSwitch,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        backgroundColor: isDark ? '#2a2020' : '#ffffff',
        color: isDark ? '#f5e6e6' : '#241818',
        py: 5,
        px: 4,
        borderRadius: 3,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.6)'
          : '0 8px 32px rgba(0,0,0,0.1)',
        minWidth: 340,
        position: 'relative',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : 'none',
      }}
    >
      <Box position="absolute" top={24} left={32}>
        <img
          src="/logo.webp"
          alt="Ludokan Logo"
          style={{ height: 50, width: 50 }}
        />
      </Box>

      <Typography
        variant="body2"
        sx={{
          position: 'absolute',
          top: 20,
          right: 50,
          cursor: 'pointer',
          fontWeight: 'bold',
          color: isDark ? '#FF8A80' : '#FF3D3D',
          transition: 'color 0.2s ease',
          '&:hover': {
            color: isDark ? '#FF6B6B' : '#D32F2F',
          },
        }}
        onClick={onSwitch}
      >
        {switchLabel}
      </Typography>

      <Typography
        variant="h4"
        fontWeight="bold"
        mb={4}
        mt={6}
        sx={{
          color: isDark ? '#f5e6e6' : '#241818',
        }}
      >
        {title}
      </Typography>

      {children}
    </Box>
  );
};

export default AuthFormContainer;
