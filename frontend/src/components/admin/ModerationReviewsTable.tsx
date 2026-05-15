import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/useAuth';
import {
  defaultAdminReviewsFilters,
  useAdminReviews,
  type AdminReviewsFilters,
} from '../../hooks/useAdminReviews';
import { apiDelete, apiPatch } from '../../services/api';
import type { AdminReviewRow } from '../../types/adminReviews';
import { hasPermission } from '../../utils/adminPermissions';
import DeleteGameModal from './DeleteGameModal';
import ErrorAlert from './ErrorAlert';
import GameUserMultiAutocompleteFilters from './GameUserMultiAutocompleteFilters';
import LoadingSkeleton from './LoadingSkeleton';

const hoverCellSx = {
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  width: '100%',
} as const;

function formatReviewAuthor(r: AdminReviewRow): string {
  const pseudo = r.user?.pseudo?.trim();
  const email = r.user?.email?.trim();
  const id = r.user?.id;
  const p = pseudo || (id == null ? '—' : `#${id}`);

  if (email) return `${p} (${email})`;
  return p;
}

function reviewAvisTooltip(r: AdminReviewRow): string {
  const t = r.title?.trim() || '(sans titre)';
  const c = r.content?.trim() || '—';

  return `${t}\n\n${c}`;
}

const ORDERING_OPTIONS = [
  { value: '-date_created', label: 'Plus récents' },
  { value: 'date_created', label: 'Plus anciens' },
  { value: '-date_modified', label: 'Modif. récente' },
  { value: 'date_modified', label: 'Modif. ancienne' },
];

export default function ModerationReviewsTable() {
  const { user } = useAuth();
  const canEdit = hasPermission(user, 'review_edit');
  const canDelete = hasPermission(user, 'review_delete');

  const [filters, setFilters] = useState<AdminReviewsFilters>(
    defaultAdminReviewsFilters
  );
  const [draftFilters, setDraftFilters] = useState<AdminReviewsFilters>(
    defaultAdminReviewsFilters
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setFilters(draftFilters), 350);
    return () => clearTimeout(t);
  }, [draftFilters]);

  useEffect(() => {
    setPage(0);
  }, [filters]);

  const { reviews, count, loading, error, refetch } = useAdminReviews(
    filters,
    page + 1,
    pageSize
  );

  const [editRow, setEditRow] = useState<AdminReviewRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStar, setEditStar] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteRow, setDeleteRow] = useState<AdminReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  async function handleSaveEdit() {
    if (!editRow) return;

    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        title: editTitle,
        content: editContent,
      };

      if (editStar !== '') {
        const n = Number.parseInt(editStar, 10);
        if (n >= 1 && n <= 5) body.rating_value = n;
      }

      await apiPatch(`/api/admin/reviews/${editRow.id}/`, body);
      setSnackbar({ message: 'Avis mis à jour.', severity: 'success' });
      setEditRow(null);
      refetch();
    } catch (e) {
      setSnackbar({
        message: e instanceof Error ? e.message : 'Erreur à l’enregistrement',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteRow) return;

    setDeleting(true);

    try {
      await apiDelete(`/api/admin/reviews/${deleteRow.id}/`);
      setSnackbar({ message: 'Avis supprimé.', severity: 'success' });
      setDeleteRow(null);
      refetch();
    } catch (e) {
      setSnackbar({
        message: e instanceof Error ? e.message : 'Erreur à la suppression',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  if (error) return <ErrorAlert message={error} />;

  const gridCols = {
    xs: 'minmax(0, 1fr) auto',
    md: `
      minmax(0, 25fr)
      minmax(0, 25fr)
      minmax(0, 25fr)
      minmax(48px, 6fr)
      minmax(96px, 11fr)
      minmax(88px, 8fr)
    `,
  } as const;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
          mb: 3,
        }}
      >
        <GameUserMultiAutocompleteFilters
          gamesValue={draftFilters.games}
          onGamesChange={next =>
            setDraftFilters({ ...draftFilters, games: next })
          }
          usersValue={draftFilters.users}
          onUsersChange={next =>
            setDraftFilters({ ...draftFilters, users: next })
          }
        />

        <TextField
          select
          label="Tri"
          size="small"
          value={draftFilters.ordering}
          onChange={e =>
            setDraftFilters({ ...draftFilters, ordering: e.target.value })
          }
        >
          {ORDERING_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Créé après"
          type="datetime-local"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={draftFilters.createdAfter}
          onChange={e =>
            setDraftFilters({ ...draftFilters, createdAfter: e.target.value })
          }
        />

        <TextField
          label="Créé avant"
          type="datetime-local"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={draftFilters.createdBefore}
          onChange={e =>
            setDraftFilters({ ...draftFilters, createdBefore: e.target.value })
          }
        />

        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const reset = { ...defaultAdminReviewsFilters };
              setDraftFilters(reset);
              setFilters(reset);
            }}
          >
            Réinitialiser filtres
          </Button>
        </Box>
      </Box>

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
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: gridCols.md,
            columnGap: 1.5,
            px: 2,
            py: 1.5,
            bgcolor: 'action.hover',
            borderBottom: 1,
            borderColor: 'divider',
            minWidth: 0,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Avis
          </Typography>

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Jeu
          </Typography>

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Auteur
          </Typography>

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Note
          </Typography>

          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 11 }}
          >
            Date
          </Typography>

          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              fontSize: 11,
              textAlign: 'right',
            }}
          >
            Actions
          </Typography>
        </Box>

        {(() => {
          if (loading) {
            return (
              <Box sx={{ p: 3 }}>
                <LoadingSkeleton variant="table" count={6} />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              </Box>
            );
          }
          if (reviews.length === 0) {
            return (
              <Typography sx={{ p: 3, color: 'text.secondary', fontSize: 14 }}>
                Aucun avis trouvé.
              </Typography>
            );
          }
          return reviews.map(r => (
            <Box
              key={r.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                columnGap: { xs: 1, md: 1.5 },
                px: 2,
                py: 1.5,
                alignItems: { xs: 'flex-start', md: 'center' },
                borderBottom: 1,
                borderColor: 'divider',
                minWidth: 0,
                '&:last-of-type': { borderBottom: 'none' },
              }}
            >
              <Tooltip
                title={reviewAvisTooltip(r)}
                enterDelay={350}
                placement="top-start"
              >
                <Box
                  sx={{
                    minWidth: 0,
                    cursor: 'help',
                    '&:hover .avis-hover-line': {
                      textDecoration: 'underline',
                      textDecorationColor: 'divider',
                      textUnderlineOffset: 2,
                    },
                  }}
                >
                  <Typography
                    className="avis-hover-line"
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      display: '-webkit-box',
                      ...hoverCellSx,
                    }}
                  >
                    {r.title || '(sans titre)'}
                  </Typography>

                  <Typography
                    className="avis-hover-line"
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      display: '-webkit-box',
                      ...hoverCellSx,
                    }}
                  >
                    {r.content || '—'}
                  </Typography>

                  <Box
                    sx={{
                      display: { xs: 'grid', md: 'none' },
                      gap: 0.5,
                      mt: 1,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="caption">
                      <strong>Jeu :</strong> {r.game?.name ?? `#${r.game?.id}`}
                    </Typography>

                    <Typography variant="caption">
                      <strong>Auteur :</strong> {formatReviewAuthor(r)}
                    </Typography>

                    <Typography variant="caption">
                      <strong>Note :</strong>{' '}
                      {r.rating == null ? '—' : String(r.rating.value)}
                    </Typography>

                    <Typography variant="caption">
                      <strong>Date :</strong>{' '}
                      {new Date(r.date_created).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>

              <Tooltip
                title={
                  r.game?.name ?? (r.game?.id == null ? '' : `#${r.game.id}`)
                }
                enterDelay={350}
                placement="top-start"
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    display: { xs: 'none', md: '-webkit-box' },
                    ...hoverCellSx,
                    cursor: 'help',
                    '&:hover': {
                      textDecoration: 'underline',
                      textDecorationColor: 'divider',
                      textUnderlineOffset: 2,
                    },
                  }}
                >
                  {r.game?.name ?? `#${r.game?.id}`}
                </Typography>
              </Tooltip>

              <Tooltip
                title={formatReviewAuthor(r)}
                enterDelay={350}
                placement="top-start"
              >
                <Typography
                  variant="body2"
                  sx={{
                    display: { xs: 'none', md: '-webkit-box' },
                    ...hoverCellSx,
                    cursor: 'help',
                    '&:hover': {
                      textDecoration: 'underline',
                      textDecorationColor: 'divider',
                      textUnderlineOffset: 2,
                    },
                  }}
                >
                  {formatReviewAuthor(r)}
                </Typography>
              </Tooltip>

              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                {r.rating == null ? '—' : String(r.rating.value)}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                {new Date(r.date_created).toLocaleString()}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 0.5,
                }}
              >
                {canEdit ? (
                  <Tooltip title="Modifier">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditRow(r);
                        setEditTitle(r.title ?? '');
                        setEditContent(r.content ?? '');

                        const v = r.rating?.value;

                        setEditStar(
                          v != null &&
                            v >= 1 &&
                            v <= 5 &&
                            Number.isInteger(Number(v))
                            ? String(v)
                            : ''
                        );
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}

                {canDelete ? (
                  <Tooltip title="Supprimer">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setDeleteRow(r)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            </Box>
          ));
        })()}
      </Box>

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={e => {
          setPageSize(Number.parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Par page :"
        sx={{ mt: 1, width: '100%', maxWidth: '100%', overflow: 'auto' }}
      />

      <Dialog
        open={!!editRow}
        onClose={() => !saving && setEditRow(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier l’avis #{editRow?.id ?? ''}</DialogTitle>

        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
        >
          <TextField
            label="Titre"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            fullWidth
          />

          <TextField
            label="Note (1 à 5)"
            type="number"
            value={editStar}
            onChange={e => {
              const raw = e.target.value;

              if (raw === '') {
                setEditStar('');
                return;
              }

              const n = Number.parseInt(raw, 10);
              if (!Number.isNaN(n) && n >= 1 && n <= 5) {
                setEditStar(String(n));
              }
            }}
            fullWidth
            inputProps={{ min: 1, max: 5, step: 1 }}
            helperText="Laisser vide pour conserver la note actuelle."
          />

          <TextField
            label="Contenu"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            fullWidth
            multiline
            minRows={4}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setEditRow(null)} disabled={saving}>
            Annuler
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={saving}
          >
            {saving ? '…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteGameModal
        open={!!deleteRow}
        gameName={deleteRow ? `Avis #${deleteRow.id}` : ''}
        dialogTitle="Supprimer cet avis"
        warningText={
          deleteRow
            ? `Confirmer la suppression définitive de l’avis #${deleteRow.id} ? Cette action est irréversible.`
            : undefined
        }
        loading={deleting}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
