import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../contexts/useAuth';
import { apiPatch } from '../services/api';
import { isTemporaryEmail } from '../utils/userUtils';

const FONT_DISPLAY = "'Outfit', sans-serif";
const FONT_BODY = "'Inter', sans-serif";

const ForcedEmailModal: React.FC = () => {
  const { user, setUser, isAuthenticated, isAuthLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (
      !isAuthLoading &&
      isAuthenticated &&
      user &&
      isTemporaryEmail(user.email)
    ) {
      setIsOpen(true);
      setEmail('');
      setError('');
    } else {
      setIsOpen(false);
    }
  }, [user, isAuthenticated, isAuthLoading]);

  const handleSave = async () => {
    if (!email || !email.includes('@')) {
      setError('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    if (isTemporaryEmail(email)) {
      setError('Veuillez entrer une véritable adresse e-mail.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedUser = await apiPatch('/api/me/', { email });
      setUser(updatedUser);
      setIsOpen(false);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la mise à jour de l'e-mail.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          borderRadius: '24px',
          p: 1,
          maxWidth: '450px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
        },
      }}
      // On empêche de fermer en cliquant à côté
      onClose={(_, reason) => {
        if (reason !== 'backdropClick') {
          setIsOpen(false);
        }
      }}
    >
      <DialogTitle
        sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '1.5rem' }}
      >
        Finaliser votre compte
      </DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            fontFamily: FONT_BODY,
            color: 'text.secondary',
            lineHeight: 1.6,
          }}
        >
          Bienvenue sur LudoKan ! Pour continuer, vous devez renseigner une
          adresse e-mail valide. Celle-ci vous permettra de récupérer votre
          compte en cas de perte.
        </Typography>
        <TextField
          fullWidth
          label="Votre adresse e-mail"
          variant="outlined"
          value={email}
          onChange={e => setEmail(e.target.value)}
          error={!!error}
          helperText={error}
          disabled={isSubmitting}
          autoFocus
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              fontFamily: FONT_BODY,
            },
            '& .MuiInputLabel-root': {
              fontFamily: FONT_BODY,
            },
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleSave}
          variant="contained"
          color="error"
          fullWidth
          disabled={isSubmitting}
          sx={{
            fontFamily: FONT_BODY,
            fontWeight: 600,
            py: 1.5,
            borderRadius: '12px',
            textTransform: 'none',
            fontSize: '1rem',
            boxShadow: '0 8px 20px rgba(211, 47, 47, 0.3)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(211, 47, 47, 0.4)',
            },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Enregistrer mon e-mail'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForcedEmailModal;
