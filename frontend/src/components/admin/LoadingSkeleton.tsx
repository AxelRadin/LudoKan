import { Box, Skeleton } from '@mui/material';

type Props = {
  variant?: 'kpi' | 'table';
  count?: number;
};

export default function LoadingSkeleton({ variant = 'kpi', count = 4 }: Props) {
  if (variant === 'table') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={48}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rectangular"
          width={180}
          height={100}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Box>
  );
}
