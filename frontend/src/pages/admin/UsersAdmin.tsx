import { Typography } from '@mui/material';
import AdminLayout from '../../components/admin/AdminLayout';
import UsersTable from '../../components/admin/UsersTable';

export default function UsersAdmin() {
  return (
    <AdminLayout>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 4, color: 'text.primary' }}
      >
        Gestion des utilisateurs
      </Typography>
      <UsersTable />
    </AdminLayout>
  );
}
