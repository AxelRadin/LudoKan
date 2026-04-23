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

const categories = [
  {
    label: 'Nécessaires',
    color: 'success' as const,
    required: true,
    description:
      'Ces cookies sont indispensables au fonctionnement de la plateforme. Ils gèrent votre session de connexion et assurent la sécurité de votre compte. Ils ne peuvent pas être désactivés.',
    examples: [
      'Session utilisateur',
      'Jeton CSRF (sécurité)',
      'Préférences de langue',
    ],
  },
  {
    label: 'Analytics',
    color: 'info' as const,
    required: false,
    description:
      "Ces cookies nous permettent de mesurer l'audience de la plateforme de manière anonymisée (pages visitées, durée de session, erreurs rencontrées). Ils nous aident à améliorer votre expérience.",
    examples: [
      'Statistiques de navigation anonymes',
      "Rapports d'erreurs (Sentry anonymisé)",
      'Pages les plus visitées',
    ],
  },
  {
    label: 'Personnalisation',
    color: 'warning' as const,
    required: false,
    description:
      "Ces cookies mémorisent vos préférences afin de personnaliser votre expérience sur Ludokan : thème (clair/sombre), préférences d'affichage, recommandations basées sur vos habitudes.",
    examples: [
      'Thème clair / sombre',
      "Préférences d'affichage",
      'Recommandations personnalisées',
    ],
  },
];

const CookiesPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ pt: 12, pb: 8 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3, color: 'text.secondary', textTransform: 'none' }}
      >
        Retour
      </Button>

      {/* En-tête */}
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'rgba(255, 100, 100, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CookieOutlinedIcon sx={{ color: 'primary.main' }} />
        </Box>
        <Typography
          variant="h5"
          fontWeight={600}
          sx={{ color: 'secondary.main' }}
        >
          Gestion des cookies
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.disabled"
        display="block"
        mb={4}
      >
        Version 1.0 – Avril 2025
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4, lineHeight: 1.8, textAlign: 'justify' }}
      >
        Ludokan utilise des cookies et technologies similaires pour assurer le
        bon fonctionnement de la plateforme, analyser son utilisation et
        personnaliser votre expérience. Lors de votre première visite, un
        bandeau vous permet d'accepter ou de refuser les catégories non
        essentielles. Vous pouvez modifier vos préférences à tout moment depuis
        les paramètres.
      </Typography>

      {/* Catégories */}
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
                    label="Toujours actifs"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ) : (
                  <Chip
                    label="Soumis à consentement"
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

      {/* Modifier les préférences */}
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
            Modifier mes préférences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vous pouvez changer vos choix à tout moment.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<SettingsOutlinedIcon />}
          onClick={() => navigate('/settings')}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Paramètres
        </Button>
      </Box>

      <Typography
        variant="caption"
        display="block"
        textAlign="center"
        sx={{ mt: 5, color: 'text.disabled' }}
      >
        Pour toute question :{' '}
        <Box component="span" sx={{ color: 'primary.main' }}>
          dpo@ludokan.fr
        </Box>
      </Typography>
    </Container>
  );
};

export default CookiesPage;
