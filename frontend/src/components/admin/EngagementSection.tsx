import { Box, Typography } from '@mui/material';
import type { AdminStats } from '../../types/admin';
import LoadingSkeleton from './LoadingSkeleton';

type Props = Readonly<{
  data: AdminStats | null;
  loading: boolean;
}>;

export default function EngagementSection({ data, loading }: Props) {
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
        Engagement
      </Typography>
      {loading || !data ? (
        <LoadingSkeleton variant="kpi" count={3} />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
              flex: 1,
              minWidth: 200,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Avis ce mois
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, fontSize: 28, mt: 1 }}
            >
              {data.engagement.reviews_last_30d}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
              flex: 1,
              minWidth: 200,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Notes ce mois
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, fontSize: 28, mt: 1 }}
            >
              {data.engagement.ratings_last_30d}
            </Typography>
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              p: 3,
              flex: 1,
              minWidth: 200,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              Utilisateurs actifs (mois)
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, fontSize: 28, mt: 1 }}
            >
              {data.engagement.active_month}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
