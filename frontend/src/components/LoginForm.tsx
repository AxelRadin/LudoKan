import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { startGoogleLogin } from '../auth/googleOAuth';
import { apiPost } from '../services/api';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost('/api/auth/login/', {
        email: email,
        password: password,
      });
      console.log('User connecté', data);

      setAuthenticated(true);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
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
          <SocialLoginButton icon="apple" />
          <SocialLoginButton icon="x" />
          <SocialLoginButton icon="instagram" />
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
