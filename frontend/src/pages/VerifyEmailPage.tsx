import React, { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { AuthFlowPageLayout } from '../components/AuthFlowPageLayout';
import PrimaryButton from '../components/PrimaryButton';
import { apiPost } from '../services/api';

const VerifyEmailPage: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!key) {
      setError(t('verifyEmailPage.error'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiPost('/api/auth/registration/verify-email/', { key });
      setSuccess(true);
    } catch {
      setError(t('verifyEmailPage.error'));
    } finally {
      setLoading(false);
    }
  }, [key, t]);

  return (
    <AuthFlowPageLayout
      title={t('verifyEmailPage.title')}
      subtitle={
        loading
          ? t('verifyEmailPage.verifying')
          : success
            ? undefined
            : key
              ? t('verifyEmailPage.intro')
              : undefined
      }
    >
      <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        {loading && <CircularProgress />}
        {success && (
          <Alert severity="success" sx={{ width: '100%', borderRadius: 3 }}>
            {t('verifyEmailPage.success')}
          </Alert>
        )}
        {error && !loading && (
          <Alert severity="error" sx={{ width: '100%', borderRadius: 3 }}>
            {error}
          </Alert>
        )}
        {!loading && !success && !key && (
          <>
            <Alert
              severity="error"
              sx={{ width: '100%', borderRadius: 3, mb: 2 }}
            >
              {t('verifyEmailPage.error')}
            </Alert>
            <PrimaryButton
              sx={{ height: 48, fontSize: 16 }}
              onClick={() => navigate('/', { replace: true })}
            >
              {t('verifyEmailPage.backToLogin')}
            </PrimaryButton>
          </>
        )}
        {!loading && !success && key && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('verifyEmailPage.confirmHint')}
            </Typography>
            <PrimaryButton
              sx={{ height: 48, fontSize: 16 }}
              onClick={() => void verify()}
            >
              {t('verifyEmailPage.confirm')}
            </PrimaryButton>
          </>
        )}
        {!loading && (success || error) && (
          <PrimaryButton
            sx={{ mt: 3, height: 48, fontSize: 16 }}
            onClick={() => navigate('/', { replace: true })}
          >
            {t('verifyEmailPage.backToLogin')}
          </PrimaryButton>
        )}
      </Box>
    </AuthFlowPageLayout>
  );
};

export default VerifyEmailPage;
