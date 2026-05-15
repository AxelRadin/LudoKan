import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '../../components/admin/AdminLayout';
import LoadingSkeleton from '../../components/admin/LoadingSkeleton';
import PanelStaffUserAutocomplete from '../../components/admin/PanelStaffUserAutocomplete';
import {
  ADMIN_ACTION_TYPE_OPTIONS,
  formatAdminActionTypeLabel,
} from '../../constants/adminActionTypes';
import { useAdminActions } from '../../hooks/useAdminActions';
import type { AdminEntityPick } from '../../types/adminReviews';
import { relativeTimeFromNow } from '../../utils/relativeTimeFromNow';

function formatTarget(targetType: string, targetId: number | null): string {
  if (!targetType && (targetId == null || targetId === undefined)) return '—';
  if (targetId != null) return `${targetType || '?'} #${targetId}`;
  return targetType || '—';
}

export default function AdminActivity() {
  const { i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [actionType, setActionType] = useState('');
  const [actor, setActor] = useState<AdminEntityPick | null>(null);

  const { data, loading, error } = useAdminActions({
    page,
    pageSize,
    actionType,
    adminUserId: actor?.id ?? null,
  });

  const rows = data?.results ?? [];
  const count = data?.count ?? 0;

  return (
    <AdminLayout>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}
      >
        Journal des actions admin
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
          alignItems: 'flex-start',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="admin-activity-type-label">
            Type d&apos;action
          </InputLabel>
          <Select
            labelId="admin-activity-type-label"
            label="Type d'action"
            value={actionType}
            onChange={e => {
              setActionType(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">
              <em>Tous</em>
            </MenuItem>
            {ADMIN_ACTION_TYPE_OPTIONS.map(t => (
              <MenuItem key={t} value={t}>
                {formatAdminActionTypeLabel(t)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: '1 1 260px', minWidth: 220, maxWidth: 420 }}>
          <PanelStaffUserAutocomplete
            value={actor}
            onChange={next => {
              setActor(next);
              setPage(0);
            }}
          />
        </Box>
      </Box>

      {error ? (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : null}

      {loading && !data ? (
        <LoadingSkeleton variant="table" count={8} />
      ) : (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'auto',
            minWidth: 0,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Acteur</TableCell>
                <TableCell>Cible</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      Aucune action pour ces filtres.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {relativeTimeFromNow(row.timestamp, i18n.language)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {formatAdminActionTypeLabel(row.action_type)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        title={row.description}
                      >
                        {row.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.admin_user_pseudo?.trim() ||
                        row.admin_user_email ||
                        (row.admin_user != null ? `#${row.admin_user}` : '—')}
                    </TableCell>
                    <TableCell>
                      {formatTarget(row.target_type, row.target_id)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Par page :"
        sx={{ mt: 1 }}
      />
    </AdminLayout>
  );
}
