import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LegalIconFrame } from '../components/legal/LegalIconFrame';

const CookiesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const categories = [
    {
      label: t('cookiesPage.necessary.label'),
      color: 'success' as const,
      required: true,
      description: t('cookiesPage.necessary.description'),
      examples: [
        t('cookiesPage.necessary.example1'),
        t('cookiesPage.necessary.example2'),
        t('cookiesPage.necessary.example3'),
      ],
    },
    {
      label: t('cookiesPage.analytics.label'),
      color: 'info' as const,
      required: false,
      description: t('cookiesPage.analytics.description'),
      examples: [
        t('cookiesPage.analytics.example1'),
        t('cookiesPage.analytics.example2'),
        t('cookiesPage.analytics.example3'),
      ],
    },
    {
      label: t('cookiesPage.personalisation.label'),
      color: 'warning' as const,
      required: false,
      description: t('cookiesPage.personalisation.description'),
      examples: [
        t('cookiesPage.personalisation.example1'),
        t('cookiesPage.personalisation.example2'),
        t('cookiesPage.personalisation.example3'),
      ],
    },
  ];

  return (
    <Container maxWidth="md" sx={{ pt: 12, pb: 8 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3, color: 'text.secondary', textTransform: 'none' }}
      >
        {t('cookiesPage.back')}
      </Button>

      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <LegalIconFrame>
          <CookieOutlinedIcon sx={{ color: 'primary.main' }} />
        </LegalIconFrame>
        <Typography
          variant="h5"
          fontWeight={600}
          sx={{ color: 'secondary.main' }}
        >
          {t('cookiesPage.title')}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.disabled"
        display="block"
        mb={4}
      >
        {t('cookiesPage.version')}
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4, lineHeight: 1.8, textAlign: 'justify' }}
      >
        {t('cookiesPage.intro')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {categories.map((cat, i) => (
          <React.Fragment key={cat.label}>
            <Box>
              <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  sx={{ color: 'secondary.main' }}
                >
                  {cat.label}
                </Typography>
                {cat.required ? (
                  <Chip
                    label={t('cookiesPage.alwaysActive')}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    label={t('cookiesPage.consentRequired')}
                    size="small"
                    color="default"
                    variant="outlined"
                  />
                )}
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, lineHeight: 1.8, textAlign: 'justify' }}
              >
                {cat.description}
              </Typography>

              <Box display="flex" flexWrap="wrap" gap={1}>
                {cat.examples.map(ex => (
                  <Chip
                    key={ex}
                    label={ex}
                    size="small"
                    color={cat.color}
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Box>
            </Box>
            {i < categories.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Box>

      <Box
        sx={{
          mt: 5,
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          bgcolor: 'background.paper',
        }}
      >
        <Box>
          <Typography fontWeight={600} sx={{ color: 'secondary.main' }}>
            {t('cookiesPage.editTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('cookiesPage.editDesc')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SettingsOutlinedIcon />}
          onClick={() => navigate('/settings')}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {t('cookiesPage.settingsBtn')}
        </Button>
      </Box>

      <Typography
        variant="caption"
        display="block"
        textAlign="center"
        sx={{ mt: 5, color: 'text.disabled' }}
      >
        {t('cookiesPage.contact')}{' '}
        <Box component="span" sx={{ color: 'primary.main' }}>
          dpo@ludokan.fr
        </Box>
      </Typography>
    </Container>
  );
};

export default CookiesPage;
