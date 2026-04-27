import { useState } from 'react';
import { startGoogleLogin } from '../auth/googleOAuth';
import { startSteamLogin } from '../auth/steamAuth';

export const useSocialAuth = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleClick = () => {
    setError(null);
    try {
      startGoogleLogin();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Connexion Google indisponible.'
      );
    }
  };

  const handleSteamClick = async () => {
    setError(null);
    try {
      await startSteamLogin();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Connexion Steam indisponible.'
      );
    }
  };

  return {
    error,
    setError,
    handleGoogleClick,
    handleSteamClick,
  };
};
