import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';
import Alert from '@mui/material/Alert';

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

  const handleSubmit = async (e: React.FormEvent) => {
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
      // 🔐 À ADAPTER selon ton backend
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: pseudo, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Échec de l'inscription.");
      }

      // const data = await res.json();
      // console.log('User inscrit', data);

      // Tu peux décider ici de basculer automatiquement sur la connexion :
      // onSwitchToLogin();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        backgroundColor: 'white',
        py: 4,
        position: 'relative',
      }}
    >
      <Box position="absolute" top={20} left={40}>
        <img src="/logo.png" alt="Ludokan Logo" style={{ height: 50 }} />
      </Box>

      <Typography
        variant="body2"
        sx={{
          position: 'absolute',
          top: 30,
          right: 40,
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
        onClick={onSwitchToLogin}
      >
        Se connecter
      </Typography>

      <Typography variant="h4" fontWeight="bold" mb={3} mt={4}>
        Inscription
      </Typography>

      <Stack spacing={2} width={300}>
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
        <Alert severity="error" sx={{ mt: 2, width: 300 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body1" mt={4}>
        S’inscrire avec
      </Typography>

      <Stack direction="row" spacing={3} mt={1}>
        <SocialLoginButton icon="google" />
        <SocialLoginButton icon="apple" />
        <SocialLoginButton icon="x" />
        <SocialLoginButton icon="instagram" />
      </Stack>

      <PrimaryButton
        sx={{ mt: 4 }}
        type="submit"
        disabled={loading}
      >
        {loading ? 'Inscription...' : 'S’inscrire'}
      </PrimaryButton>
    </Box>
  );
};

export default RegisterForm;
