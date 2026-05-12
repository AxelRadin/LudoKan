import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { apiPost } from '../services/api';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginSection from './SocialLoginSection';
import { useSocialAuth } from '../hooks/useSocialAuth';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

const isValidEmail = (value: string): boolean => {
  const trimmedValue = value.trim();

  if (trimmedValue.length > 254) {
    return false;
  }

  const atIndex = trimmedValue.indexOf('@');
  const lastDotIndex = trimmedValue.lastIndexOf('.');

  return (
    atIndex > 0 &&
    lastDotIndex > atIndex + 1 &&
    lastDotIndex < trimmedValue.length - 1 &&
    !trimmedValue.includes(' ')
  );
};

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
  const [showPassword, setShowPassword] = useState(false);
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

  // Forgot Password Modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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

  const handleForgotPasswordOpen = () => {
    setForgotPasswordOpen(true);
    setResetEmail('');
    setResetSuccess(false);
    setResetError(null);
  };

  const handleForgotPasswordClose = () => {
    setForgotPasswordOpen(false);
    setResetEmail('');
    setResetSuccess(false);
    setResetError(null);
  };

  const handleResetPassword = async () => {
    setResetError(null);

    if (!resetEmail) {
      setResetError('Veuillez entrer votre adresse email.');
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setResetError('Adresse email invalide.');
      return;
    }

    try {
      setResetLoading(true);
      await apiPost('/api/auth/password-reset/', {
        email: resetEmail.trim(),
      });
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(
        err.message || "Erreur lors de l'envoi de l'email de réinitialisation."
      );
    } finally {
      setResetLoading(false);
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
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={e => e.preventDefault()}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Mot de passe oublié */}
          <Link
            component="button"
            type="button"
            onClick={handleForgotPasswordOpen}
            underline="hover"
            sx={{
              alignSelf: 'flex-end',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Mot de passe oublié ?
          </Link>

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

      {/* Modal Mot de passe oublié */}
      <Dialog
        open={forgotPasswordOpen}
        onClose={handleForgotPasswordClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
          Mot de passe oublié
        </DialogTitle>
        <DialogContent>
          {resetSuccess ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              Un email de réinitialisation a été envoyé à{' '}
              <strong>{resetEmail}</strong>. Vérifiez votre boîte de réception.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
                Entrez votre adresse email et nous vous enverrons un lien pour
                réinitialiser votre mot de passe.
              </Typography>
              <TextField
                autoFocus
                label="Adresse email"
                type="email"
                fullWidth
                variant="outlined"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                error={!!resetError}
                helperText={resetError}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleForgotPasswordClose} sx={{ borderRadius: 2 }}>
            {resetSuccess ? 'Fermer' : 'Annuler'}
          </Button>
          {!resetSuccess && (
            <Button
              onClick={handleResetPassword}
              variant="contained"
              disabled={resetLoading}
              sx={{ borderRadius: 2 }}
            >
              {resetLoading ? 'Envoi...' : 'Envoyer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AuthFormContainer>
  );
};

export default LoginForm;
