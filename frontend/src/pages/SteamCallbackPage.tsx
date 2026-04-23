import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';

const SteamCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    const run = async () => {
      const searchParams = new URLSearchParams(location.search);
      const params: Record<string, string> = {};

      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      if (Object.keys(params).length === 0) {
        setError('Aucun paramètre Steam reçu.');
        return;
      }

      try {
        const res = await apiPost('/api/auth/steam/callback/', params);
        // Authentifie l'utilisateur dans le store React
        setUser(res.user);
        setAuthenticated(true);
        // Redirection vers le profil après succès
        if (res.is_new_user) {
          navigate('/profile?syncing=true&new_user=true', { replace: true });
        } else {
          navigate('/profile?syncing=true', { replace: true });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Échec de la connexion Steam';
        setError(message);
      }
    };

    void run();
  }, [navigate, location.search, setAuthenticated]);

  if (error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', mt: 8 }}>
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography
            component="a"
            href="/profile"
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
            }}
          >
            Retour au profil
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 480,
        mx: 'auto',
        mt: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Liaison avec Steam en cours
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Veuillez patienter pendant que nous finalisons la connexion...
        </Typography>
      </Box>
    </Box>
  );
};

export default SteamCallbackPage;
