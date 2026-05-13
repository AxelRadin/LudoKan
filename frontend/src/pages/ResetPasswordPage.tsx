import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Alert, CircularProgress } from '@mui/material';
import { AuthFlowPageLayout } from '../components/AuthFlowPageLayout';
import PasswordField from '../components/PasswordField';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import PrimaryButton from '../components/PrimaryButton';
import { apiPost } from '../services/api';

function normalizeFieldErrors(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String).join(' ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

/** Message affiché après échec POST reset/confirm (lien invalide, JSON Django, texte brut). */
function mapResetConfirmApiError(
  rawMessage: string,
  t: (key: string) => string
): string {
  if (rawMessage.includes('token') || rawMessage.includes('uid')) {
    return t('resetPasswordPage.errorInvalidLink');
  }
  try {
    const parsed = JSON.parse(rawMessage) as Record<string, unknown>;
    return (
      normalizeFieldErrors(parsed.new_password2) ??
      normalizeFieldErrors(parsed.new_password1) ??
      (rawMessage || t('resetPasswordPage.errorGeneric'))
    );
  } catch {
    return rawMessage || t('resetPasswordPage.errorGeneric');
  }
}

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(mapResetConfirmApiError(msg, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlowPageLayout
      title={t('resetPasswordPage.title')}
      subtitle={t('resetPasswordPage.subtitle')}
    >
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
    </AuthFlowPageLayout>
  );
};

export default ResetPasswordPage;
