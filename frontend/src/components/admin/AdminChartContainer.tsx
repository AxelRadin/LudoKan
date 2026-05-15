import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  height?: number | string;
  sx?: object;
}>;

/**
 * Shared container for admin dashboard charts and skeletons to ensure visual consistency
 * and reduce code duplication (SonarQube remediation).
 */
export default function AdminChartContainer({
  title,
  description,
  children,
  height,
  sx,
}: Props) {
  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        minWidth: 0,
        height: height ?? '100%',
        ...sx,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, mb: description ? 0.5 : 1 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1 }}
        >
          {description}
        </Typography>
      )}
      {children}
    </Box>
  );
}

export function EmptyChartMessage({ text }: Readonly<{ text: string }>) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'action.hover',
        px: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {text}
      </Typography>
    </Box>
  );
}
