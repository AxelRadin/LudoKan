import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export type OAuthCallbackLayoutProps = Readonly<{
  error: string | null;
  /** Contenu sous l’alerte d’erreur (ex. lien retour profil). */
  errorFooter?: ReactNode;
  loadingTitle: string;
  loadingSubtitle?: string;
  /** Variante du titre en chargement (Google : une seule ligne body). */
  loadingTitleVariant?: 'h6' | 'body1';
  progressSize?: number;
  /** Si absent avec `progressSize`, pas d’épaisseur forcée (défaut MUI). */
  progressThickness?: number;
}>;

/**
 * Mise en page commune des pages de retour OAuth (Microsoft, Google, Steam, etc.)
 * pour réduire la duplication détectée par Sonar.
 */
export default function OAuthCallbackLayout({
  error,
  errorFooter,
  loadingTitle,
  loadingSubtitle,
  loadingTitleVariant = 'h6',
  progressSize,
  progressThickness = 4,
}: OAuthCallbackLayoutProps) {
  if (error) {
    return (
      <Box sx={{ p: 4, maxWidth: 480, mx: 'auto', mt: 8 }}>
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
        {errorFooter ? (
          <Box sx={{ mt: 2, textAlign: 'center' }}>{errorFooter}</Box>
        ) : null}
      </Box>
    );
  }

  const progressProps =
    progressSize === undefined
      ? {}
      : {
          size: progressSize,
          thickness: progressSize >= 40 ? progressThickness : undefined,
        };

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 480,
        mx: 'auto',
        mt: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <CircularProgress {...progressProps} />
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant={loadingTitleVariant} gutterBottom>
          {loadingTitle}
        </Typography>
        {loadingSubtitle ? (
          <Typography variant="body2" color="text.secondary">
            {loadingSubtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
