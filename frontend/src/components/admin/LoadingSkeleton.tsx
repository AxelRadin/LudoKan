import { Box, Skeleton } from '@mui/material';

type Props = Readonly<{
  variant?: 'kpi' | 'table';
  count?: number;
}>;

const buildSkeletonKeys = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => `${prefix}-skeleton-${index}`);

export default function LoadingSkeleton({ variant = 'kpi', count = 4 }: Props) {
  const skeletonKeys = buildSkeletonKeys(count, variant);

  if (variant === 'table') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {skeletonKeys.map(key => (
          <Skeleton
            key={key}
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
      {skeletonKeys.map(key => (
        <Skeleton
          key={key}
          variant="rectangular"
          width={180}
          height={100}
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Box>
  );
}
