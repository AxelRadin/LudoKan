import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

export interface PageLayoutProps {
  title: React.ReactNode;
  backTo?: string;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  backTo = '/',
  children,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 28%),
              radial-gradient(circle at 86% 16%, rgba(120,20,20,0.18) 0%, transparent 28%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.07) 0%, transparent 24%),
              linear-gradient(180deg, #1a1010 0%, #221414 55%, #1e1212 100%)
            `
          : `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
              radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 24%),
              radial-gradient(circle at 86% 16%, rgba(255,210,210,0.80) 0%, transparent 26%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.08) 0%, transparent 24%),
              linear-gradient(180deg, #fdf4f4 0%, #f9ecec 55%, #fef6f6 100%)
            `,
      }}
    >
      <Box sx={{ px: 4, py: 4, ml: 25, mr: 25 }}>
        <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Link to={backTo} style={{ textDecoration: 'none' }}>
            <Button variant="outlined" size="small">
              ← Retour
            </Button>
          </Link>
          <Typography variant="h5" fontWeight="bold">
            {title}
          </Typography>
        </Box>
        {children}
      </Box>
    </Box>
  );
};

export default PageLayout;
