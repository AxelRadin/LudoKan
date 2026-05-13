import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import PasswordField from '../components/PasswordField';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import PrimaryButton from '../components/PrimaryButton';
import { apiPost } from '../services/api';

const ResetPasswordPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassword = (): string | null => {
    if (!newPassword1 || !newPassword2) {
      return t('resetPasswordPage.errorFillFields');
    }
    if (newPassword1.length < 8) {
      return t('resetPasswordPage.errorMinLength');
    }
    if (newPassword1 !== newPassword2) {
      return t('resetPasswordPage.errorMismatch');
    }
    if (/^\d+$/.test(newPassword1)) {
      return t('resetPasswordPage.errorAllNumeric');
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await apiPost('/api/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 3000);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('token') || msg.includes('uid')) {
        setError(t('resetPasswordPage.errorInvalidLink'));
      } else {
        // Try to parse Django field errors
        try {
          const parsed = JSON.parse(msg);
          if (parsed.new_password2) {
            const msgs = Array.isArray(parsed.new_password2)
              ? parsed.new_password2
              : [parsed.new_password2];
            setError(msgs.join(' '));
            return;
          }
          if (parsed.new_password1) {
            const msgs = Array.isArray(parsed.new_password1)
              ? parsed.new_password1
              : [parsed.new_password1];
            setError(msgs.join(' '));
            return;
          }
        } catch {
          // not JSON
        }
        setError(msg || t('resetPasswordPage.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 12, pb: 6 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <img
            src="/logo.png"
            alt="LudoKan"
            style={{ height: 56, marginBottom: 16 }}
          />
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: 'secondary.main' }}
          >
            {t('resetPasswordPage.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {t('resetPasswordPage.subtitle')}
          </Typography>
        </Box>

        {success ? (
          <Alert severity="success" sx={{ width: '100%', borderRadius: 3 }}>
            {t('resetPasswordPage.success')}
          </Alert>
        ) : (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
              maxWidth: 400,
            }}
          >
            <PasswordField
              label={t('resetPasswordPage.newPassword')}
              variant="outlined"
              fullWidth
              value={newPassword1}
              onChange={e => setNewPassword1(e.target.value)}
              autoFocus
            />
            <PasswordStrengthIndicator password={newPassword1} />
            <PasswordField
              label={t('resetPasswordPage.confirmPassword')}
              variant="outlined"
              fullWidth
              value={newPassword2}
              onChange={e => setNewPassword2(e.target.value)}
              error={!!newPassword2 && newPassword1 !== newPassword2}
              helperText={
                newPassword2 && newPassword1 !== newPassword2
                  ? t('resetPasswordPage.errorMismatch')
                  : undefined
              }
            />

            {error && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <PrimaryButton
              type="submit"
              disabled={loading}
              sx={{ height: 48, fontSize: 16, mt: 1 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                t('resetPasswordPage.submit')
              )}
            </PrimaryButton>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;
