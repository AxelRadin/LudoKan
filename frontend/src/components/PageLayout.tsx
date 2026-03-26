import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';

export interface PageLayoutProps {
  /** Titre affiché à côté du bouton Retour. */
  title: React.ReactNode;
  /** Route du lien "Retour" (défaut: "/"). */
  backTo?: string;
  children: React.ReactNode;
}

/** Layout commun pour les pages avec marge, bouton Retour et titre (ex. SearchResults, TrendingCategory). */
export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  backTo = '/',
  children,
}) => (
  <Box sx={{ px: 4, py: 4, ml: 25, mr: 25 }}>
    <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
      <Link to={backTo} style={{ textDecoration: 'none' }}>
        <Button variant="outlined" size="small">
          ← Retour
        </Button>
      </Link>
      <Typography variant="h5" fontWeight="bold">
        {title}
      </Typography>
    </Box>
    {children}
  </Box>
);

export default PageLayout;
