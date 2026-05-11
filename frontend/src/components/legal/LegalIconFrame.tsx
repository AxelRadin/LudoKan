import Box from '@mui/material/Box';
import type { ReactNode } from 'react';

const frameSx = {
  width: 44,
  height: 44,
  borderRadius: 2,
  bgcolor: 'rgba(255, 100, 100, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const;

export function LegalIconFrame({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <Box sx={frameSx}>{children}</Box>;
}
