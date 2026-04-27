import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GavelIcon from '@mui/icons-material/Gavel';
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined';
import { Box, Button, Container, Typography } from '@mui/material';
import React, { useState } from 'react';

import { LegalPolicyPickCard } from '../components/legal/LegalPolicyPickCard';
import { LegalDocumentSections } from './politiques/LegalDocumentSections';
import { POLICIES, type PolicyId } from './politiques/politiquesDocuments';

type PolicyKey = PolicyId | null;

const PolitiquesPage: React.FC = () => {
  const [active, setActive] = useState<PolicyKey>(null);

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
            Politiques
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Consultez nos documents juridiques et politiques en vigueur.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LegalPolicyPickCard
              icon={<PrivacyTipOutlinedIcon sx={{ color: 'primary.main' }} />}
              title="Politique de Confidentialité"
              subtitle="RGPD, données personnelles, cookies, vos droits"
              onClick={() => setActive('confidentialite')}
            />
            <LegalPolicyPickCard
              icon={<GavelIcon sx={{ color: 'primary.main' }} />}
              title="Conditions Générales d'Utilisation"
              subtitle="Règles d'accès, services, responsabilités, modération"
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
            Retour aux politiques
          </Button>
          <LegalDocumentSections document={policy} />
        </>
      )}
    </Container>
  );
};

export default PolitiquesPage;
