import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import Button from '@mui/material/Button';
import SocialLoginButton from './SocialLoginButton';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string;

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setError('Veuillez valider le reCAPTCHA.');
      return;
    }

    setError(null);

    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, recaptcha_token: captchaToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data?.detail ?? 'Identifiants incorrects.');
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch {
      setError('Erreur réseau, veuillez réessayer.');
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width="100%"
      minHeight="100vh"
      sx={{ backgroundColor: 'white' }}
    >
      <Box position="absolute" top={20} left={40}>
        <img src="/logo.png" alt="Ludokan Logo" style={{ height: 50 }} />
      </Box>

      <Typography variant="h4" fontWeight="bold" mb={3}>
        Connexion
      </Typography>

      <Stack spacing={2} width={300}>
        <TextField
          label="Pseudo"
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Mot de passe"
          type="password"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ReCAPTCHA
          ref={recaptchaRef}
          sitekey={RECAPTCHA_SITE_KEY}
          onChange={(token) => setCaptchaToken(token)}
        />
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
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

      <Button type="submit" variant="contained" sx={{ mt: 4 }}>
        Se connecter
      </Button>

      <Typography
        variant="body2"
        sx={{ position: 'absolute', top: 30, right: 40 }}
      >
        S'inscrire
      </Typography>
    </Box>
  );
};

export default LoginForm;
