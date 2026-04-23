import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', background: isDark ? `...` : `...` }}>
      <Box sx={{ px: 4, py: 4, maxWidth: 1400, mx: 'auto' }}>
        <Box mb={3} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Link to={backTo} style={{ textDecoration: 'none' }}>
            <Button variant="outlined" size="small">
              {t('pageLayout.back')}
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
