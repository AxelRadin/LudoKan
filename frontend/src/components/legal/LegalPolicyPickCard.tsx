import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';

import { LegalIconFrame } from './LegalIconFrame';

const paperSx = {
  p: 3,
  borderRadius: 3,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  transition: 'all 0.15s',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'rgba(255, 100, 100, 0.04)',
    transform: 'translateX(4px)',
  },
} as const;

export type LegalPolicyPickCardProps = Readonly<{
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}>;

export function LegalPolicyPickCard({
  icon,
  title,
  subtitle,
  onClick,
}: LegalPolicyPickCardProps) {
  return (
    <Paper variant="outlined" onClick={onClick} sx={paperSx}>
      <LegalIconFrame>{icon}</LegalIconFrame>
      <Box flex={1}>
        <Typography fontWeight={600} sx={{ color: 'secondary.main' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ color: 'text.disabled' }} />
    </Paper>
  );
}
