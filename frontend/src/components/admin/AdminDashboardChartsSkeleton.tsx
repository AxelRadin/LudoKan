import { Box, Grid, Skeleton, Typography } from '@mui/material';

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
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Skeleton variant="text" width="42%" height={22} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="78%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton
              variant="rounded"
              height={280}
              sx={{ borderRadius: 1, width: '100%' }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              height: '100%',
            }}
          >
            <Skeleton variant="text" width="55%" height={22} sx={{ mb: 1.5 }} />
            <Skeleton
              variant="rounded"
              height={260}
              sx={{ borderRadius: 1, width: '100%' }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              height: '100%',
            }}
          >
            <Skeleton variant="text" width="60%" height={22} sx={{ mb: 1.5 }} />
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
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
