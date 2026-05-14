import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import OAuthCallbackLayout from '../components/OAuthCallbackLayout';

const SteamCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const run = async () => {
      const searchParams = new URLSearchParams(location.search);
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      if (Object.keys(params).length === 0) {
        setError(t('steamCallback.errorNoParams'));
        return;
      }

      try {
        const res = await apiPost('/api/auth/steam/callback/', params);
        setUser(res.user);
        setAuthenticated(true);
        if (res.is_new_user) {
          navigate('/profile?syncing=true&new_user=true', { replace: true });
        } else {
          navigate('/profile?syncing=true', { replace: true });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('steamCallback.errorFallback');
        setError(message);
      }
    };

    run();
  }, [navigate, location.search, t, setAuthenticated, setUser]);

  return (
    <OAuthCallbackLayout
      error={error}
      errorFooter={
        error ? (
          <Typography
            component="a"
            href="/profile"
            sx={{
              cursor: 'pointer',
              color: 'primary.main',
              textDecoration: 'underline',
            }}
          >
            {t('steamCallback.backToProfile')}
          </Typography>
        ) : undefined
      }
      loadingTitle={t('steamCallback.loadingTitle')}
      loadingSubtitle={t('steamCallback.loadingDesc')}
      progressSize={60}
      progressThickness={4}
    />
  );
};

export default SteamCallbackPage;
