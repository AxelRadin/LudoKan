import { Typography } from '@mui/material';
import { lazy, Suspense } from 'react';
import AdminDashboardChartsSkeleton from '../../components/admin/AdminDashboardChartsSkeleton';
import AdminLayout from '../../components/admin/AdminLayout';
import EngagementSection from '../../components/admin/EngagementSection';
import KpiSection from '../../components/admin/KpiSection';
import QuickActions from '../../components/admin/QuickActions';
import RecentActivity from '../../components/admin/RecentActivity';
import { useAdminStats } from '../../hooks/useAdminStats';

const AdminDashboardCharts = lazy(
  () => import('../../components/admin/AdminDashboardCharts')
);

export default function AdminDashboard() {
  const { data, loading, error } = useAdminStats();

  return (
    <AdminLayout>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 4, color: 'text.primary' }}
      >
        Dashboard
      </Typography>

      <QuickActions />
      <KpiSection data={data} loading={loading} />
      {error ? null : loading || !data ? (
        <AdminDashboardChartsSkeleton />
      ) : (
        <Suspense fallback={<AdminDashboardChartsSkeleton />}>
          <AdminDashboardCharts data={data} />
        </Suspense>
      )}
      <EngagementSection data={data} loading={loading} />
      <RecentActivity data={data} loading={loading} />

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
