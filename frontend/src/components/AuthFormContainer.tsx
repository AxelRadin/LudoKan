import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    sx={{
      backgroundColor: 'white',
      py: 5,
      px: 4,
      borderRadius: 3,
      boxShadow: 3,
      minWidth: 340,
      position: 'relative',
    }}
  >
    <Box position="absolute" top={24} left={32}>
      <img src="/logo.png" alt="Ludokan Logo" style={{ height: 50 }} />
    </Box>

    <Typography
      variant="body2"
      sx={{
        position: 'absolute',
        top: 20,
        right: 50,
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
      onClick={onSwitch}
    >
      {switchLabel}
    </Typography>

    <Typography variant="h4" fontWeight="bold" mb={4} mt={6}>
      {title}
    </Typography>

    {children}
  </Box>
);

export default AuthFormContainer;
