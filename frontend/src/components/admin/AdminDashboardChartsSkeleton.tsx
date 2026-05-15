import { Box, Grid, Skeleton, Typography } from '@mui/material';
import AdminChartContainer from './AdminChartContainer';

/**
 * Squelette aligné sur la zone « Tendances » (chargement chunk lazy ou données API).
 * Fichier séparé pour ne pas importer @mui/x-charts dans le bundle initial du dashboard.
 */
export default function AdminDashboardChartsSkeleton() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          fontSize: 14,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        Tendances
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <AdminChartContainer
            title="Utilisateurs (14 derniers jours)"
            description="Nouveaux comptes (création) et connexions distinctes par jour."
          >
            <Skeleton
              variant="rounded"
              height={280}
              sx={{ borderRadius: 1, width: '100%' }}
            />
          </AdminChartContainer>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AdminChartContainer title="Jeux les plus commentés">
            <Skeleton
              variant="rounded"
              height={260}
              sx={{ borderRadius: 1, width: '100%' }}
            />
          </AdminChartContainer>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <AdminChartContainer title="Répartition par genre (jeux)">
            <Skeleton
              variant="rounded"
              height={260}
              sx={{
                borderRadius: '50%',
                width: 260,
                mx: 'auto',
                display: 'block',
              }}
            />
          </AdminChartContainer>
        </Grid>
      </Grid>
    </Box>
  );
}
