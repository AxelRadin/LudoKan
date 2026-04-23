import { Alert, CircularProgress, Container, Typography } from '@mui/material';
import { useAdminStats } from '../../hooks/useAdminStats';

export default function AdminDashboard() {
  const { loading, error } = useAdminStats();

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard Admin
      </Typography>
      {/* KpiCards, EngagementMetrics, RecentActivity à venir */}
    </Container>
  );
}
