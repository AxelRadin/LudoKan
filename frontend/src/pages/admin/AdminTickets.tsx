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
import ErrorAlert from '../../components/admin/ErrorAlert';
import LoadingSkeleton from '../../components/admin/LoadingSkeleton';
import { useAdminTickets } from '../../hooks/useAdminTickets';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  reviewing: 'En cours',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  published: 'Publié',
};

function getStatusColor(
  status: string
): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'approved' || status === 'published') return 'success';
  if (status === 'rejected') return 'error';
  if (status === 'reviewing') return 'warning';
  return 'default';
}

export default function AdminTickets() {
  const { tickets, loading, error } = useAdminTickets();

  return (
    <AdminLayout>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Tickets
      </Typography>

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
                <TableCell>Jeu</TableCell>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aucun ticket.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map(ticket => (
                  <TableRow key={ticket.id} hover>
                    <TableCell>{ticket.game_name}</TableCell>
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
