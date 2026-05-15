import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import React, { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginSection from './SocialLoginSection';
import { useSocialAuth } from '../hooks/useSocialAuth';
import PasswordField from './PasswordField';
import { useLoginForm } from '../hooks/useLoginForm';
import ForgotPasswordDialog from './ForgotPasswordDialog';

const getTextFieldStyles = (isDark: boolean) => ({
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)',
    },
    '&:hover fieldset': {
      borderColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.87)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#FF3D3D',
    },
  },
  '& .MuiInputLabel-root': {
    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#FF3D3D',
  },
});

type LoginFormProps = {
  onSwitchToRegister: () => void;
  onLoginSuccess?: () => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onLoginSuccess,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    email,
    setEmail,
    password,
    setPassword,
    setCaptchaToken,
    loading,
    error,
    handleSubmit,
    RECAPTCHA_SITE_KEY,
  } = useLoginForm(onLoginSuccess);

  const {
    error: socialError,
    handleGoogleClick,
    handleSteamClick,
  } = useSocialAuth();

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const displayError = error || socialError;

  return (
    <AuthFormContainer
      title={t('loginForm.title')}
      switchLabel={t('loginForm.switchLabel')}
      onSwitch={onSwitchToRegister}
    >
      <form onSubmit={e => handleSubmit(e, recaptchaRef)}>
        <Stack spacing={2.5} width={320}>
          <TextField
            label={t('loginForm.email')}
            variant="outlined"
            value={email}
            onChange={e => setEmail(e.target.value)}
            sx={getTextFieldStyles(isDark)}
          />
          <PasswordField
            label={t('loginForm.password')}
            variant="outlined"
            value={password}
            onChange={e => setPassword(e.target.value)}
            sx={getTextFieldStyles(isDark)}
          />

          <Link
            component="button"
            type="button"
            onClick={() => setForgotPasswordOpen(true)}
            underline="hover"
            sx={{
              alignSelf: 'flex-end',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              color: isDark ? '#FF8A80' : '#FF3D3D',
              '&:hover': {
                color: isDark ? '#FF6B6B' : '#D32F2F',
              },
            }}
          >
            {t('loginForm.forgotPasswordLink')}
          </Link>

          {RECAPTCHA_SITE_KEY ? (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={token => setCaptchaToken(token)}
              theme={isDark ? 'dark' : 'light'}
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

        <LoginFormFooter
          isDark={isDark}
          t={t}
          onSwitchToRegister={onSwitchToRegister}
        />
      </form>

      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </AuthFormContainer>
  );
};

const LoginFormFooter: React.FC<{
  isDark: boolean;
  t: any;
  onSwitchToRegister: () => void;
}> = ({ isDark, t, onSwitchToRegister }) => (
  <>
    <Typography
      variant="body2"
      mt={2}
      sx={{
        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      }}
    >
      {t('loginForm.noAccount')}{' '}
      <Link
        component="button"
        type="button"
        onClick={onSwitchToRegister}
        underline="hover"
        sx={{
          fontWeight: 600,
          color: isDark ? '#FF8A80' : '#FF3D3D',
          '&:hover': {
            color: isDark ? '#FF6B6B' : '#D32F2F',
          },
        }}
      >
        {t('loginForm.createAccount')}
      </Link>
    </Typography>

    <Typography
      variant="body2"
      mt={2}
      sx={{
        width: 320,
        textAlign: 'center',
        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      }}
    >
      {t('loginForm.terms')}{' '}
      <Link
        component={RouterLink}
        to="/conditions"
        underline="hover"
        sx={{
          fontWeight: 600,
          color: isDark ? '#FF8A80' : '#FF3D3D',
          '&:hover': {
            color: isDark ? '#FF6B6B' : '#D32F2F',
          },
        }}
      >
        {t('loginForm.termsLink')}
      </Link>{' '}
      {t('loginForm.and')}{' '}
      <Link
        component={RouterLink}
        to="/politique"
        underline="hover"
        sx={{
          fontWeight: 600,
          color: isDark ? '#FF8A80' : '#FF3D3D',
          '&:hover': {
            color: isDark ? '#FF6B6B' : '#D32F2F',
          },
        }}
      >
        {t('loginForm.privacyLink')}
      </Link>
      .
    </Typography>
  </>
);

export default LoginForm;
