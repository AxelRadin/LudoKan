import { Stack, Typography } from '@mui/material';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function AdminNotFound() {
  return (
    <AdminLayout>
      <AdminPageHeader title="Page admin introuvable" />
      <Stack spacing={2} sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          La route demandée n&apos;existe pas ou vous n&apos;avez pas les
          permissions nécessaires pour y accéder.
        </Typography>
      </Stack>
    </AdminLayout>
  );
}
