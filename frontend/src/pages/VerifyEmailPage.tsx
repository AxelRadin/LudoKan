import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
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
      } catch (err: any) {
        setError(t('verifyEmailPage.error'));
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [key, t]);

  const handleBackToLogin = () => {
    navigate('/', { replace: true });
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
            {t('verifyEmailPage.title')}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={48} sx={{ mb: 2 }} color="secondary" />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {t('verifyEmailPage.verifying')}
            </Typography>
          </Box>
        ) : success ? (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="success" sx={{ width: '100%', borderRadius: 3, mb: 4, textAlign: 'left' }}>
              {t('verifyEmailPage.success')}
            </Alert>
            <PrimaryButton
              onClick={handleBackToLogin}
              sx={{ height: 48, fontSize: 16, width: '100%', maxWidth: 320 }}
            >
              {t('verifyEmailPage.backToLogin')}
            </PrimaryButton>
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Alert severity="error" sx={{ width: '100%', borderRadius: 3, mb: 4, textAlign: 'left' }}>
              {error || t('verifyEmailPage.error')}
            </Alert>
            <PrimaryButton
              onClick={handleBackToLogin}
              sx={{ height: 48, fontSize: 16, width: '100%', maxWidth: 320 }}
            >
              {t('verifyEmailPage.backToLogin')}
            </PrimaryButton>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default VerifyEmailPage;
