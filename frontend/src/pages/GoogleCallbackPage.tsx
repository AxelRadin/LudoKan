import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';

const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const googleError = url.searchParams.get('error');

      if (googleError) {
        setError(`Google a renvoyé une erreur : ${googleError}`);
        return;
      }

      if (!code) {
        setError('Aucun code Google reçu.');
        return;
      }

      try {
        await apiPost('/api/auth/google/', { code });
        setAuthenticated(true);
        navigate('/', { replace: true });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Échec du login Google';
        setError(message);
      }
    };

    void run();
  }, [navigate, setAuthenticated]);

  if (error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 480,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body1">Connexion en cours…</Typography>
    </Box>
  );
};

export default GoogleCallbackPage;
