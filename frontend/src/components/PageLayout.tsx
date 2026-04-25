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
  const pageBackground = isDark
    ? 'linear-gradient(180deg, #1a1010 0%, #221414 100%)'
    : 'linear-gradient(180deg, #fdf4f4 0%, #f9ecec 100%)';

  return (
    <Box sx={{ minHeight: '100vh', background: pageBackground }}>
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
