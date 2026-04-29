import GamesIcon from '@mui/icons-material/SportsEsports';
import PeopleIcon from '@mui/icons-material/People';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Box, Typography } from '@mui/material';
import type { AdminStats } from '../../types/admin';
import KpiCard from './KpiCard';
import LoadingSkeleton from './LoadingSkeleton';

type Props = {
  data: AdminStats | null;
  loading: boolean;
};

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
          color: '#888',
        }}
      >
        Vue globale
      </Typography>
      {loading || !data ? (
        <LoadingSkeleton variant="kpi" count={4} />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <KpiCard
            title="Utilisateurs"
            value={data.totals.users}
            icon={<PeopleIcon fontSize="small" />}
            sub={`${data.engagement.active_week} actifs cette semaine`}
          />
          <KpiCard
            title="Jeux publiés"
            value={data.totals.games}
            icon={<GamesIcon fontSize="small" />}
          />
          <KpiCard
            title="Avis"
            value={data.totals.reviews}
            icon={<RateReviewIcon fontSize="small" />}
            sub={`${data.engagement.reviews_last_30d} ce mois`}
          />
          <KpiCard
            title="Tickets"
            value={data.totals.tickets}
            icon={<ConfirmationNumberIcon fontSize="small" />}
          />
        </Box>
      )}
    </Box>
  );
}
