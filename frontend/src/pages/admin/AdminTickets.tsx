import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import ErrorAlert from '../../components/admin/ErrorAlert';
import LoadingSkeleton from '../../components/admin/LoadingSkeleton';
import { useAdminTickets } from '../../hooks/useAdminTickets';

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  account: 'Compte',
  other: 'Autre',
};

function getStatusColor(
  status: string
): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'resolved' || status === 'closed') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'open') return 'default';
  return 'default';
}

export default function AdminTickets() {
  const { tickets, loading, error } = useAdminTickets();

  return (
    <AdminLayout>
      <AdminPageHeader title="Support" />

      {loading ? <LoadingSkeleton variant="table" count={8} /> : null}
      {error ? <ErrorAlert message={error} /> : null}

      {!loading && !error && (
        <TableContainer
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sujet</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aucun ticket support.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map(ticket => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </TableCell>
                    <TableCell>
                      {ticket.user_pseudo ?? ticket.user_email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={getStatusColor(ticket.status)}
                        label={STATUS_LABELS[ticket.status] ?? ticket.status}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AdminLayout>
  );
}
