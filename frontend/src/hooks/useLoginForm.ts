import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

export const useLoginForm = (onLoginSuccess?: () => void) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
    recaptchaRef: React.RefObject<any>
  ) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t('loginForm.errorFillFields'));
      return;
    }
    if (!RECAPTCHA_SITE_KEY) {
      setError(t('loginForm.errorRecaptchaNotConfigured'));
      return;
    }
    if (!captchaToken) {
      setError(t('loginForm.errorRecaptcha'));
      return;
    }

    try {
      setLoading(true);
      await apiPost('/api/auth/login/', {
        email,
        password,
        recaptcha_token: captchaToken,
      });
      setAuthenticated(true);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || t('loginForm.errorFallback'));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    captchaToken,
    setCaptchaToken,
    loading,
    error,
    setError,
    handleSubmit,
    RECAPTCHA_SITE_KEY,
  };
};
