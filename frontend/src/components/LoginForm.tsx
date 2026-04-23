import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { startGoogleLogin } from '../auth/googleOAuth';
import { startSteamLogin } from '../auth/steamAuth';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

type LoginFormProps = {
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (!RECAPTCHA_SITE_KEY) {
      setError(
        'reCAPTCHA non configuré : définissez VITE_RECAPTCHA_SITE_KEY (voir frontend/.env.example).'
      );
      return;
    }

    if (!captchaToken) {
      setError('Veuillez valider le reCAPTCHA.');
      return;
    }

    try {
      setLoading(true);
      await apiPost('/api/auth/login/', {
        email: email,
        password: password,
        recaptcha_token: captchaToken,
      });

      setAuthenticated(true);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
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

  return (
    <AuthFormContainer
      title="Connexion"
      switchLabel="S’inscrire"
      onSwitch={onSwitchToRegister}
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} width={320}>
          <TextField
            label="Email"
            variant="outlined"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Mot de passe"
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
              Variable VITE_RECAPTCHA_SITE_KEY manquante : le login ne peut pas
              fonctionner.
            </Alert>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2.5, width: 320 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" mt={5}>
          Se connecter avec
        </Typography>

        <Stack direction="row" spacing={3} mt={1.5}>
          <SocialLoginButton icon="google" onClick={handleGoogleClick} />
          <SocialLoginButton icon="steam" onClick={handleSteamClick} />
          <SocialLoginButton icon="apple" />
          <SocialLoginButton icon="x" />
        </Stack>

        <PrimaryButton
          sx={{ mt: 5, width: 320, height: 48, fontSize: 18 }}
          type="submit"
          disabled={loading}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </PrimaryButton>

        <Typography variant="body2" mt={2}>
          Tu n&apos;as pas encore de compte ?{' '}
          <Link
            component="button"
            type="button"
            onClick={onSwitchToRegister}
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            Créer un compte
          </Link>
        </Typography>
        <Typography
          variant="body2"
          mt={2}
          sx={{ width: 320, textAlign: 'center' }}
        >
          En vous connectant, vous acceptez nos{' '}
          <Link
            component={RouterLink}
            to="/conditions"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            Conditions d&apos;utilisation
          </Link>{' '}
          et notre{' '}
          <Link
            component={RouterLink}
            to="/politique"
            underline="hover"
            sx={{ fontWeight: 600 }}
          >
            Politique de confidentialité
          </Link>
          .
        </Typography>
      </form>
    </AuthFormContainer>
  );
};

export default LoginForm;
