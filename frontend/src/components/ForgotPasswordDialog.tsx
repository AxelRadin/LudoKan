import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { apiPost } from '../services/api';

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

interface ForgotPasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setResetError(null);

    if (!resetEmail) {
      setResetError(t('loginForm.forgotEnterEmail'));
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setResetError(t('loginForm.forgotInvalidEmail'));
      return;
    }

    try {
      setResetLoading(true);
      await apiPost('/api/auth/password/reset/', {
        email: resetEmail.trim(),
      });
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || t('loginForm.forgotSendError'));
    } finally {
      setResetLoading(false);
    }
  };

  const handleClose = () => {
    setResetEmail('');
    setResetSuccess(false);
    setResetError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          bgcolor: isDark ? '#2a2020' : '#ffffff',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, fontSize: 20 }}>
        {t('loginForm.forgotPasswordTitle')}
      </DialogTitle>
      <DialogContent>
        {resetSuccess ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            {t('loginForm.forgotSuccessMessage', { email: resetEmail })}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
              {t('loginForm.forgotDescription')}
            </Typography>
            <TextField
              autoFocus
              label={t('loginForm.forgotEmailLabel')}
              type="email"
              fullWidth
              variant="outlined"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              error={!!resetError}
              helperText={resetError}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.23)'
                      : 'rgba(0,0,0,0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.4)'
                      : 'rgba(0,0,0,0.87)',
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
              }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          {resetSuccess ? t('common.close') : t('common.cancel')}
        </Button>
        {!resetSuccess && (
          <Button
            onClick={handleResetPassword}
            variant="contained"
            disabled={resetLoading}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FF3D3D 0%, #D32F2F 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #D32F2F 0%, #B71C1C 100%)',
              },
              '&:disabled': {
                background: isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.12)',
              },
            }}
          >
            {resetLoading
              ? t('loginForm.forgotSending')
              : t('loginForm.forgotSend')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
