import AdminLayout from '../../components/admin/AdminLayout';
import GamesTable from '../../components/admin/GamesTable';
import { Typography } from '@mui/material';

export default function AdminGames() {
  return (
    <AdminLayout>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 4, color: 'text.primary' }}
      >
        Catalogue jeux
      </Typography>
      <GamesTable />
    </AdminLayout>
  );
}
