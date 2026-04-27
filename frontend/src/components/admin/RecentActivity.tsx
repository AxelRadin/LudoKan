import { Box, Divider, Typography } from '@mui/material';
import type { AdminStats } from '../../types/admin';
import LoadingSkeleton from './LoadingSkeleton';

type Props = {
  data: AdminStats | null;
  loading: boolean;
};

export default function RecentActivity({ data, loading }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
      {/* Derniers tickets */}
      <Box
        sx={{
          flex: 1,
          minWidth: 280,
          bgcolor: '#fff',
          border: '0.5px solid rgba(0,0,0,0.1)',
          borderRadius: 3,
          p: 3,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#aaa',
            display: 'block',
            mb: 2,
          }}
        >
          Derniers tickets
        </Typography>
        {loading || !data ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : data.recent_activity.length === 0 ? (
          <Typography variant="caption" sx={{ color: '#aaa', fontSize: 12 }}>
            Aucune activité récente
          </Typography>
        ) : (
          data.recent_activity.slice(0, 5).map((a, i) => (
            <Box key={a.id}>
              {i > 0 && <Divider sx={{ my: 1 }} />}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, fontSize: 13 }}
                  >
                    {a.action}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#888', fontSize: 11 }}
                  >
                    {a.user}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Placeholder reports */}
      <Box
        sx={{
          flex: 1,
          minWidth: 280,
          bgcolor: '#fff',
          border: '0.5px solid rgba(0,0,0,0.1)',
          borderRadius: 3,
          p: 3,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#aaa',
            display: 'block',
            mb: 2,
          }}
        >
          Engagement
        </Typography>
        {loading || !data ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : (
          <>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Actifs aujourd'hui : <strong>{data.engagement.active_day}</strong>
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Actifs cette semaine :{' '}
              <strong>{data.engagement.active_week}</strong>
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Messages ce mois :{' '}
              <strong>{data.engagement.messages_last_30d}</strong>
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
