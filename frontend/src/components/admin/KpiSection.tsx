import GamesIcon from '@mui/icons-material/SportsEsports';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FlagIcon from '@mui/icons-material/Flag';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Box, Grid, Typography } from '@mui/material';
import type { AdminStats } from '../../types/admin';
import KpiCard from './KpiCard';
import LoadingSkeleton from './LoadingSkeleton';

type Props = Readonly<{
  data: AdminStats | null;
  loading: boolean;
}>;

export default function KpiSection({ data, loading }: Props) {
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
        Vue globale
      </Typography>
      {loading || !data ? (
        <LoadingSkeleton variant="kpi" count={4} />
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Utilisateurs"
              value={data.totals.users}
              icon={<PeopleIcon fontSize="small" />}
              sub={`${data.engagement.active_week} actifs cette semaine`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Nouveaux utilisateurs (7j)"
              value={data.totals.users_new_last_7_days}
              icon={<PersonAddIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Jeux publiés"
              value={data.totals.games}
              icon={<GamesIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Avis"
              value={data.totals.reviews}
              icon={<RateReviewIcon fontSize="small" />}
              sub={`${data.engagement.reviews_last_30d} ce mois`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Support"
              value={data.totals.support_tickets}
              icon={<ConfirmationNumberIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Support ouverts"
              value={data.totals.support_tickets_open}
              icon={<PendingActionsIcon fontSize="small" />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              title="Signalements non résolus"
              value={data.totals.reports_unresolved}
              icon={<FlagIcon fontSize="small" />}
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
