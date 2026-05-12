import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginSection from './SocialLoginSection';
import { useSocialAuth } from '../hooks/useSocialAuth';
import { apiPost } from '../services/api';

type RegisterFormProps = {
  onSwitchToLogin: () => void;
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { t } = useTranslation();
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    error: socialError,
    handleGoogleClick,
    handleSteamClick,
  } = useSocialAuth();

  const displayError = error || socialError;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!pseudo || !email || !password || !password2) {
      setError(t('registerForm.errorFillFields'));
      return;
    }
    if (password !== password2) {
      setError(t('registerForm.errorPasswordMatch'));
      return;
    }

    try {
      setLoading(true);
      await apiPost('/api/auth/registration/', {
        pseudo,
        email,
        password1: password,
        password2,
      });
      onSwitchToLogin();
    } catch (err: any) {
      setError(err.message || t('registerForm.errorFallback'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormContainer
      title={t('registerForm.title')}
      switchLabel={t('registerForm.switchLabel')}
      onSwitch={onSwitchToLogin}
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} width={320}>
          <TextField
            label={t('registerForm.pseudo')}
            variant="outlined"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
          />
          <TextField
            label={t('registerForm.email')}
            variant="outlined"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label={t('registerForm.password')}
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
          <TextField
            label={t('registerForm.confirmPassword')}
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
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
        </Stack>

        {displayError && (
          <Alert severity="error" sx={{ mt: 2.5, width: 320 }}>
            {displayError}
          </Alert>
        )}

        <SocialLoginSection
          title="S’inscrire avec"
          onGoogleClick={handleGoogleClick}
          onSteamClick={handleSteamClick}
        />

        <PrimaryButton
          sx={{ mt: 5, width: 320, height: 48, fontSize: 18 }}
          type="submit"
          disabled={loading}
        >
          {loading ? t('registerForm.submitting') : t('registerForm.submit')}
        </PrimaryButton>
      </form>
    </AuthFormContainer>
  );
};

export default RegisterForm;
