import { Box, Grid, Skeleton, Typography } from '@mui/material';

/** Squelette page statistiques (hors chunk @mui/x-charts). */
export default function AdminStatsInsightsSkeleton() {
  return (
    <Box sx={{ mb: 4 }}>
      <Skeleton variant="text" width={280} height={36} sx={{ mb: 3 }} />

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
            <Skeleton variant="text" width="50%" height={22} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="85%" height={14} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={280} sx={{ width: '100%' }} />
          </Box>
        </Grid>
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
            <Skeleton variant="text" width="55%" height={22} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={14} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={260} sx={{ width: '100%' }} />
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
            <Skeleton variant="text" width="45%" height={22} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={280} sx={{ width: '100%' }} />
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
            <Skeleton variant="text" width="40%" height={22} sx={{ mb: 1.5 }} />
            <Skeleton
              variant="rounded"
              height={280}
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

      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', mt: 2 }}
      >
        Chargement des graphiques…
      </Typography>
    </Box>
  );
}
