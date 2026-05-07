import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined';
import { Box, Button, Container, Typography } from '@mui/material';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPolicyPickCard } from '../components/legal/LegalPolicyPickCard';
import { LegalDocumentSections } from './politiques/LegalDocumentSections';
import { getPolicies, type PolicyId } from './politiques/politiquesDocuments';

const PolitiquesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<PolicyId | null>(null);

  const POLICIES = useMemo(() => getPolicies(), [i18n.language]);
  const policy = active ? POLICIES[active] : null;

  return (
    <Container maxWidth="md" sx={{ pt: 12, pb: 8 }}>
      {!active && (
        <>
          <Typography
            variant="h5"
            fontWeight={600}
            sx={{ mb: 1, color: 'secondary.main' }}
          >
            {t('politiques.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            {t('politiques.subtitle')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LegalPolicyPickCard
              icon={<PrivacyTipOutlinedIcon sx={{ color: 'primary.main' }} />}
              title={t('politiques.privacyTitle')}
              subtitle={t('politiques.privacySubtitle')}
              onClick={() => setActive('confidentialite')}
            />
            <LegalPolicyPickCard
              icon={<GavelIcon sx={{ color: 'primary.main' }} />}
              title={t('politiques.cguTitle')}
              subtitle={t('politiques.cguSubtitle')}
              onClick={() => setActive('cgu')}
            />
          </Box>
        </>
      )}

      {policy && (
        <>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => setActive(null)}
            sx={{ mb: 3, color: 'text.secondary', textTransform: 'none' }}
          >
            {t('politiques.back')}
          </Button>
          <LegalDocumentSections document={policy} />
        </>
      )}
    </Container>
  );
};

export default PolitiquesPage;
