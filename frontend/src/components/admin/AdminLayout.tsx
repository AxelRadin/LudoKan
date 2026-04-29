import { Box } from '@mui/material';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

type Props = { children: React.ReactNode };

export default function AdminLayout({ children }: Props) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f6fa' }}>
      <AdminSidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AdminHeader />
        <Box sx={{ flex: 1, p: 4 }}>{children}</Box>
      </Box>
    </Box>
  );
}
