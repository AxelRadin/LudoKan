import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiGet, apiPost } from '../services/api';
import OAuthCallbackLayout from '../components/OAuthCallbackLayout';
import { readOAuthReturnFromUrl } from '../utils/oauthCallbackUrl';

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
      const { code, state, providerError } = readOAuthReturnFromUrl(
        globalThis.location.href
      );

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

    run();
  }, [navigate, setAuthenticated, setUser, t]);

  return (
    <OAuthCallbackLayout
      error={error}
      loadingTitle={t('microsoftCallback.loadingTitle')}
      loadingSubtitle={t('microsoftCallback.loadingDesc')}
      progressSize={60}
      progressThickness={4}
    />
  );
};

export default MicrosoftCallbackPage;
