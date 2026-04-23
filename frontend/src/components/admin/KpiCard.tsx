import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: number | string;
  icon?: ReactNode;
  sub?: string;
};

export default function KpiCard({ title, value, icon, sub }: Props) {
  return (
    <Box
      sx={{
        bgcolor: '#fff',
        border: '0.5px solid rgba(0,0,0,0.1)',
        borderRadius: 3,
        p: 3,
        minWidth: 160,
        flex: 1,
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
            color: '#aaa',
          }}
        >
          {title}
        </Typography>
        {icon && <Box sx={{ color: '#C41A1A', opacity: 0.7 }}>{icon}</Box>}
      </Box>
      <Typography
        variant="h4"
        sx={{ fontWeight: 700, fontSize: 28, color: '#111' }}
      >
        {value}
      </Typography>
      {sub && (
        <Typography
          variant="caption"
          sx={{ color: '#888', fontSize: 11, mt: 0.5, display: 'block' }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}
