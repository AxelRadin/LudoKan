import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';

export default function AdminNotFound() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <Stack spacing={2} sx={{ py: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Page admin introuvable
        </Typography>
        <Typography variant="body2" color="text.secondary">
          La route demandee n&apos;existe pas.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/admin/dashboard')}
          sx={{ width: 'fit-content' }}
        >
          Retour au dashboard
        </Button>
      </Stack>
    </AdminLayout>
  );
}
