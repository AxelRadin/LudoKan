import { Typography } from '@mui/material';
import { lazy, Suspense } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminStatsInsightsSkeleton from '../../components/admin/AdminStatsInsightsSkeleton';
import { useAdminStatsInsights } from '../../hooks/useAdminStatsInsights';

const AdminStatsInsightsCharts = lazy(
  () => import('../../components/admin/AdminStatsInsightsCharts')
);

export default function AdminStatsPage() {
  const { data, loading, error } = useAdminStatsInsights();

  return (
    <AdminLayout>
      <AdminPageHeader title="Statistiques détaillées" />

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 3, maxWidth: 720 }}
      >
        Graphiques avancés (avis, notes, signalements, messages, support et
        statuts de jeux). Les données sont calculées côté serveur ; cette page
        charge les graphiques à la demande.
      </Typography>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      {!error && (loading || !data) ? <AdminStatsInsightsSkeleton /> : null}

      {!error && !loading && data ? (
        <Suspense fallback={<AdminStatsInsightsSkeleton />}>
          <AdminStatsInsightsCharts data={data} />
        </Suspense>
      ) : null}
    </AdminLayout>
  );
}
