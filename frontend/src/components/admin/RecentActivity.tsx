import { Box, Divider, Typography } from '@mui/material';
import type { AdminStats } from '../../types/admin';
import LoadingSkeleton from './LoadingSkeleton';

type Props = Readonly<{
  data: AdminStats | null;
  loading: boolean;
}>;

function renderRecentActivity(data: AdminStats | null, loading: boolean) {
  if (loading || !data) {
    return <LoadingSkeleton variant="table" count={3} />;
  }

  if (data.recent_activity.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: '#aaa', fontSize: 12 }}>
        Aucune activité récente
      </Typography>
    );
  }

  return data.recent_activity.slice(0, 5).map((activity, index) => (
    <Box key={activity.id}>
      {index > 0 && <Divider sx={{ my: 1 }} />}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
            {activity.action}
          </Typography>
          <Typography variant="caption" sx={{ color: '#888', fontSize: 11 }}>
            {activity.actor ?? '—'}
            {activity.target ? ` → ${activity.target}` : ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  ));
}

export default function RecentActivity({ data, loading }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
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

        {renderRecentActivity(data, loading)}
      </Box>

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
              Actifs aujourd&apos;hui :{' '}
              <strong>{data.engagement.active_day}</strong>
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
