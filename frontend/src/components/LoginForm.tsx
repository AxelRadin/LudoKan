import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { useState } from 'react';
import PrimaryButton from './PrimaryButton';
import SocialLoginButton from './SocialLoginButton';
import Alert from '@mui/material/Alert';
import { apiPost } from "../services/api";

type LoginFormProps = {
  onSwitchToRegister: () => void;
};

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
    setLoading(true);
    const data = await apiPost("/api/auth/login/", {
      email: email,
      password: password
    });
// ajouter une redirection à la connexion
    // data contient le token, ex:
    // { "key": "abc123" }
    console.log("User connecté", data);

    // Stocker le token localement pour authentifier les prochaines requêtes
    localStorage.setItem("token", data.key || data.access);

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
        onClick={onSwitchToRegister}
      >
        S’inscrire
      </Typography>

      <Typography variant="h4" fontWeight="bold" mb={3} mt={4}>
        Connexion
      </Typography>

      <Stack spacing={2} width={300}>
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
        <Alert severity="error" sx={{ mt: 2, width: 300 }}>
          {error}
        </Alert>
      )}

      <Typography variant="body1" mt={4}>
        Se connecter avec
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
        {loading ? 'Connexion...' : 'Se connecter'}
      </PrimaryButton>
    </Box>
  );
};

export default LoginForm;
