import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import { apiPost } from '../services/api';
import AuthFormContainer from './AuthFormContainer';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';

type RegisterFormProps = {
  onSwitchToLogin: () => void;
};

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!pseudo || !email || !password || !password2) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);

      await apiPost('/api/auth/registration/', {
        pseudo: pseudo,
        email: email,
        password1: password,
        password2: password2,
      });

      onSwitchToLogin();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <AuthFormContainer
      title="Inscription"
      switchLabel="Se connecter"
      onSwitch={onSwitchToLogin}
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5} width={320}>
          <TextField
            label="Pseudo"
            variant="outlined"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
          />
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
          <TextField
            label="Confirmez votre mot de passe"
            type="password"
            variant="outlined"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2.5, width: 320 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" mt={5}>
          S’inscrire avec
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
          {loading ? 'Inscription...' : 'S’inscrire'}
        </PrimaryButton>
      </form>
    </AuthFormContainer>
  );
};

export default RegisterForm;
