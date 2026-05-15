import RateReviewIcon from '@mui/icons-material/RateReview';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminRatingsTable from '../../components/admin/AdminRatingsTable';
import ModerationReviewsTable from '../../components/admin/ModerationReviewsTable';
import { useAuth } from '../../contexts/useAuth';
import { hasPermission } from '../../utils/adminPermissions';

type TabKey = 'avis' | 'notes';

export default function AdminReviews() {
  const { user } = useAuth();
  const canReviews = hasPermission(user, 'review_read');
  const canRatings = hasPermission(user, 'rating_read');
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultTab: TabKey = useMemo(() => {
    if (canReviews) return 'avis';
    return 'notes';
  }, [canReviews]);

  const [tab, setTab] = useState<TabKey>(defaultTab);

  useEffect(() => {
    const raw = (searchParams.get('tab') || '').toLowerCase();
    if (raw === 'notes' && canRatings) {
      setTab('notes');
    } else if (raw === 'avis' && canReviews) {
      setTab('avis');
    } else {
      setTab(defaultTab);
    }
  }, [searchParams, canReviews, canRatings, defaultTab]);

  if (!canReviews && !canRatings) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  function handleTabChange(_: React.SyntheticEvent, value: TabKey) {
    if (value === 'notes' && !canRatings) return;
    if (value === 'avis' && !canReviews) return;
    setTab(value);
    if (value === 'notes') {
      setSearchParams({ tab: 'notes' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <RateReviewIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: 'text.primary' }}
        >
          Notes et avis
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Modération des avis texte et des notes associées aux jeux.
      </Typography>

      {canReviews && canRatings ? (
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Avis" value="avis" />
          <Tab label="Notes" value="notes" />
        </Tabs>
      ) : null}

      {tab === 'avis' && canReviews ? <ModerationReviewsTable /> : null}
      {tab === 'notes' && canRatings ? <AdminRatingsTable /> : null}
    </AdminLayout>
  );
}
