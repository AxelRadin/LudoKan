import { Typography } from '@mui/material';
import AdminLayout from '../../components/admin/AdminLayout';
import EngagementSection from '../../components/admin/EngagementSection';
import KpiSection from '../../components/admin/KpiSection';
import QuickActions from '../../components/admin/QuickActions';
import RecentActivity from '../../components/admin/RecentActivity';
import { useAdminStats } from '../../hooks/useAdminStats';

export default function AdminDashboard() {
  const { data, loading, error } = useAdminStats();

  return (
    <AdminLayout>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
        Dashboard
      </Typography>

      <KpiSection data={data} loading={loading} />
      <EngagementSection data={data} loading={loading} />
      <RecentActivity data={data} loading={loading} />
      <QuickActions />

      {error && (
        <Typography
          variant="caption"
          sx={{ color: 'error.main', mt: 2, display: 'block' }}
        >
          {error}
        </Typography>
      )}
    </AdminLayout>
  );
}
