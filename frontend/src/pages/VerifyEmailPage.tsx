import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, CircularProgress } from '@mui/material';
import { AuthFlowPageLayout } from '../components/AuthFlowPageLayout';
import PrimaryButton from '../components/PrimaryButton';
import { apiPost } from '../services/api';

const VerifyEmailPage: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!key) {
        setError(t('verifyEmailPage.error'));
        setLoading(false);
        return;
      }

      try {
        await apiPost('/api/auth/registration/verify-email/', { key });
        setSuccess(true);
      } catch {
        setError(t('verifyEmailPage.error'));
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [key, t]);

  return (
    <AuthFlowPageLayout
      title={t('verifyEmailPage.title')}
      subtitle={loading ? t('verifyEmailPage.verifying') : undefined}
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
        {!loading && (
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
