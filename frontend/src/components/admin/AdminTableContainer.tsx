import {
  Alert,
  Box,
  CircularProgress,
  Snackbar,
  TablePagination,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import ErrorAlert from './ErrorAlert';
import LoadingSkeleton from './LoadingSkeleton';
import type { SnackbarState } from '../../hooks/useAdminTableState';

interface AdminTableContainerProps {
  loading: boolean;
  error: string | null;
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  emptyMessage: string;
  children: ReactNode;
  header?: ReactNode;
  snackbar: SnackbarState | null;
  onSnackbarClose: () => void;
}

/**
 * A shared container for admin tables that handles:
 * - Common layout (border, background, radius)
 * - Loading states (skeleton + spinner)
 * - Error states (ErrorAlert)
 * - Empty states
 * - Pagination
 * - Snackbar notifications
 */
export default function AdminTableContainer({
  loading,
  error,
  count,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  emptyMessage,
  children,
  header,
  snackbar,
  onSnackbarClose,
}: AdminTableContainerProps) {
  if (error) return <ErrorAlert message={error} />;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          maxWidth: '100%',
        }}
      >
        {header}

        {loading ? (
          <Box sx={{ p: 3 }}>
            <LoadingSkeleton variant="table" count={6} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={28} />
            </Box>
          </Box>
        ) : count === 0 ? (
          <Typography sx={{ p: 3, color: 'text.secondary', fontSize: 14 }}>
            {emptyMessage}
          </Typography>
        ) : (
          children
        )}
      </Box>

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => {
          onPageSizeChange(Number.parseInt(e.target.value, 10));
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Par page :"
        sx={{ mt: 1, width: '100%', maxWidth: '100%', overflow: 'auto' }}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={onSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar?.severity}
          onClose={onSnackbarClose}
          variant="filled"
        >
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
