import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import OAuthCallbackLayout from '../components/OAuthCallbackLayout';
import { readOAuthReturnFromUrl } from '../utils/oauthCallbackUrl';

const GoogleCallbackPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const run = async () => {
      const { code, providerError } = readOAuthReturnFromUrl(
        globalThis.location.href
      );

      if (providerError) {
        setError(t('googleCallback.errorGoogle', { error: providerError }));
        return;
      }
      if (!code) {
        setError(t('googleCallback.errorNoCode'));
        return;
      }

      try {
        await apiPost('/api/auth/google/', { code });
        setAuthenticated(true);
        navigate('/', { replace: true });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : t('googleCallback.errorFallback');
        setError(message);
      }
    };

    void run();
  }, [navigate, setAuthenticated, t]);

  return (
    <OAuthCallbackLayout
      error={error}
      loadingTitle={t('googleCallback.loading')}
      loadingTitleVariant="body1"
    />
  );
};

export default GoogleCallbackPage;
