import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startGoogleLogin } from '../auth/googleOAuth';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginSection from './SocialLoginSection';
import { useSocialAuth } from '../hooks/useSocialAuth';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

type LoginFormProps = {
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onLoginSuccess,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();
  const {
    error: socialError,
    handleGoogleClick,
    handleSteamClick,
  } = useSocialAuth();

  const displayError = error || socialError;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      if (onLoginSuccess) onLoginSuccess();
      else navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || t('loginForm.errorFallback'));
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setError(null);
    try {
      startGoogleLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('loginForm.errorGoogle'));
    }
  };

  return (
    <AuthFormContainer
      title={t('loginForm.title')}
      switchLabel={t('loginForm.switchLabel')}
      onSwitch={onSwitchToRegister}
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} width={320}>
          <TextField
            label={t('loginForm.email')}
            variant="outlined"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label={t('loginForm.password')}
            type="password"
            variant="outlined"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {RECAPTCHA_SITE_KEY ? (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={token => setCaptchaToken(token)}
            />
          ) : (
            <Alert severity="warning" sx={{ width: '100%' }}>
              {t('loginForm.recaptchaMissing')}
            </Alert>
          )}
        </Stack>

        {displayError && (
          <Alert severity="error" sx={{ mt: 2.5, width: 320 }}>
            {displayError}
          </Alert>
        )}

        <SocialLoginSection
          title="Se connecter avec"
          onGoogleClick={handleGoogleClick}
          onSteamClick={handleSteamClick}
        />

        <PrimaryButton
          sx={{ mt: 5, width: 320, height: 48, fontSize: 18 }}
          type="submit"
          disabled={loading}
        >
          {loading ? t('loginForm.submitting') : t('loginForm.submit')}
        </PrimaryButton>

        <Typography variant="body2" mt={2}>
          {t('loginForm.noAccount')}{' '}
          <Link
            component="button"
            type="button"
            onClick={onSwitchToRegister}
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {t('loginForm.createAccount')}
          </Link>
        </Typography>

        <Typography
          variant="body2"
          mt={2}
          sx={{ width: 320, textAlign: 'center' }}
        >
          {t('loginForm.terms')}{' '}
          <Link
            component={RouterLink}
            to="/conditions"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {t('loginForm.termsLink')}
          </Link>{' '}
          {t('loginForm.and')}{' '}
          <Link
            component={RouterLink}
            to="/politique"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            {t('loginForm.privacyLink')}
          </Link>
          .
        </Typography>
      </form>
    </AuthFormContainer>
  );
};

export default LoginForm;
