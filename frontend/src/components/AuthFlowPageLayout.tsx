import { Box, Container, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type AuthFlowPageLayoutProps = Readonly<{
  title: string;
  subtitle?: string;
  children: ReactNode;
}>;

/**
 * Shell commun (logo, titre, sous-titre) pour les flux auth hors modale
 * (réinitialisation mot de passe, vérification e-mail, etc.).
 */
export function AuthFlowPageLayout(props: AuthFlowPageLayoutProps) {
  const { title, subtitle, children } = props;
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
            style={{ height: 56, width: 56, marginBottom: 16 }}
          />
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: 'secondary.main' }}
          >
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {children}
      </Box>
    </Container>
  );
}
