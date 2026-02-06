import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Ajout
import { apiPost } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  const navigate = useNavigate(); // Ajout
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

      // Met à jour l'état d'authentification global
      setAuthenticated(true);
      onLoginSuccess?.();

      // Redirection vers la page d'accueil (les cookies JWT sont déjà posés par le backend)
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
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
          <SocialLoginButton icon="google" />
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
      </form>
    </AuthFormContainer>
  );
};

export default LoginForm;
