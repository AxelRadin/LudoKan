import { Box, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = Readonly<{
  title: string;
  value: number | string;
  icon?: ReactNode;
  sub?: string;
  loading?: boolean;
}>;

export default function KpiCard({ title, value, icon, sub, loading }: Props) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 1,
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
          {title}
        </Typography>
        {icon && <Box sx={{ color: 'error.main', opacity: 0.75 }}>{icon}</Box>}
      </Box>
      {loading ? (
        <Skeleton variant="text" width={60} height={40} />
      ) : (
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, fontSize: 28, color: 'text.primary' }}
        >
          {value}
        </Typography>
      )}
      {sub && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: 11,
            mt: 0.5,
            display: 'block',
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}
