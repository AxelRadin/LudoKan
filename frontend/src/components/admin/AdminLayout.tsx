import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useState } from 'react';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

type Props = Readonly<{ children: React.ReactNode }>;

export default function AdminLayout({ children }: Props) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <AdminSidebar
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader
          showMenuButton={!isDesktop}
          onOpenMenu={() => setMobileOpen(true)}
        />
        <Box sx={{ flex: 1, px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
