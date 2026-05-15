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
import { useAdminReports } from '../../hooks/useAdminReports';

export default function AdminReports() {
  const { reports, loading, error } = useAdminReports();

  return (
    <AdminLayout>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Reports
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
                <TableCell>ID</TableCell>
                <TableCell>Reporter</TableCell>
                <TableCell>Cible</TableCell>
                <TableCell>Traité</TableCell>
                <TableCell>Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aucun report.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => (
                  <TableRow key={report.id} hover>
                    <TableCell>#{report.id}</TableCell>
                    <TableCell>{report.reporter_label}</TableCell>
                    <TableCell>{`${report.target_type} #${report.target_id}`}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={report.handled ? 'success' : 'warning'}
                        label={report.handled ? 'Oui' : 'Non'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString()}
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
