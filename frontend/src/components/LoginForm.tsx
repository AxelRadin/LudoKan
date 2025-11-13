import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React from 'react';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';

export const LoginForm: React.FC = () => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100vh"
    sx={{ backgroundColor: 'white' }}
  >
    <Box position="absolute" top={20} left={40}>
      <img src="/logo.png" alt="Ludokan Logo" style={{ height: 50 }} />
    </Box>

    <Typography variant="h4" fontWeight="bold" mb={3}>
      Connexion
    </Typography>

    <Stack spacing={2} width={300}>
      <TextField label="Pseudo" variant="outlined" />
      <TextField label="Mot de passe" type="password" variant="outlined" />
    </Stack>

    <Typography variant="body1" mt={4}>
      Se connecter avec
    </Typography>

    <Stack direction="row" spacing={3} mt={1}>
      <SocialLoginButton icon="google" />
      <SocialLoginButton icon="apple" />
      <SocialLoginButton icon="x" />
      <SocialLoginButton icon="instagram" />
    </Stack>

    <PrimaryButton sx={{ mt: 4 }}>Se connecter</PrimaryButton>

    <Typography
      variant="body2"
      sx={{ position: 'absolute', top: 30, right: 40 }}
    >
      S’inscrire
    </Typography>
  </Box>
);

export default LoginForm;
