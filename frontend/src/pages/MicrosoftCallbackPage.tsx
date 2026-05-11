import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiGet, apiPost } from '../services/api';

const MicrosoftCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuthenticated, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const run = async () => {
      const url = new URL(globalThis.location.href);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const providerError = url.searchParams.get('error');

      if (providerError) {
        setError(
          t('microsoftCallback.errorMicrosoft', { error: providerError })
        );
        return;
      }
      if (!code || !state) {
        setError(t('microsoftCallback.errorNoCode'));
        return;
      }

      try {
        await apiPost('/api/auth/microsoft/callback/', { code, state });
        const me = await apiGet('/api/me/');
        setUser(me);
        setAuthenticated(true);
        navigate('/profile?xbox_connected=true', { replace: true });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : t('microsoftCallback.errorFallback');
        setError(message);
      }
    };

    void run();
  }, [navigate, setAuthenticated, setUser, t]);

  if (error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', mt: 8 }}>
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
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
          {t('microsoftCallback.loadingTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('microsoftCallback.loadingDesc')}
        </Typography>
      </Box>
    </Box>
  );
};

export default MicrosoftCallbackPage;
