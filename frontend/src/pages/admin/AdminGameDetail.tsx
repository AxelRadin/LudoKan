import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import DeleteGameModal from '../../components/admin/DeleteGameModal';
import ErrorAlert from '../../components/admin/ErrorAlert';
import { useAuth } from '../../contexts/useAuth';
import { useAdminGame } from '../../hooks/useAdminGame';
import { apiDelete, apiPatch } from '../../services/api';
import type { AdminGameDetail } from '../../types/adminGames';
import { fetchAllPaginated } from '../../utils/fetchAllPaginated';
import { hasPermission } from '../../utils/adminPermissions';

type CatalogItem = { id: number; name: string };

const STATUS_OPTIONS = [
  { value: 'released', label: 'Released' },
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'early_access', label: 'Early Access' },
  { value: 'offline', label: 'Offline' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rumored', label: 'Rumored' },
  { value: 'delisted', label: 'Delisted' },
];

function formFromGame(g: AdminGameDetail) {
  return {
    name: g.name,
    name_fr: g.name_fr,
    description: g.description,
    status: g.status,
    cover_url: g.cover_url ?? '',
    release_date: g.release_date ?? '',
    min_players: g.min_players == null ? '' : String(g.min_players),
    max_players: g.max_players == null ? '' : String(g.max_players),
    min_age: g.min_age == null ? '' : String(g.min_age),
    publisherId: g.publisher.id,
    genreIds: g.genres.map(x => x.id),
    platformIds: g.platforms.map(x => x.id),
  };
}

export default function AdminGameDetail() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const gameId = Number.parseInt(gameIdParam ?? '', 10);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { game, loading, error, refetch } = useAdminGame(gameId);

  const canEdit = hasPermission(user, 'game_edit');
  const canDelete = hasPermission(user, 'game_delete');

  const [form, setForm] = useState<ReturnType<typeof formFromGame> | null>(
    null
  );
  const [genresCatalog, setGenresCatalog] = useState<CatalogItem[]>([]);
  const [platformsCatalog, setPlatformsCatalog] = useState<CatalogItem[]>([]);
  const [publishersCatalog, setPublishersCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      try {
        const [g, p, pub] = await Promise.all([
          fetchAllPaginated<CatalogItem>('/api/genres/'),
          fetchAllPaginated<CatalogItem>('/api/platforms/'),
          fetchAllPaginated<CatalogItem>('/api/publishers/'),
        ]);
        if (!cancelled) {
          setGenresCatalog(g);
          setPlatformsCatalog(p);
          setPublishersCatalog(pub);
        }
      } catch {
        if (!cancelled) {
          setSnackbar({
            message: 'Impossible de charger genres / plateformes / éditeurs.',
            severity: 'error',
          });
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (game) setForm(formFromGame(game));
  }, [game]);

  async function handleSave() {
    if (!form || !game) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        name_fr: form.name_fr,
        description: form.description,
        status: form.status,
        cover_url: form.cover_url.trim() || null,
        release_date: form.release_date.trim() || null,
        min_players:
          form.min_players.trim() === '' ? null : Number(form.min_players),
        max_players:
          form.max_players.trim() === '' ? null : Number(form.max_players),
        min_age: form.min_age.trim() === '' ? null : Number(form.min_age),
        publisher: form.publisherId,
        genres: form.genreIds,
        platforms: form.platformIds,
      };
      await apiPatch(`/api/admin/games/${game.id}/`, body);
      setSnackbar({ message: 'Jeu mis à jour.', severity: 'success' });
      await refetch();
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
    if (!game) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/admin/games/${game.id}/`);
      setDeleteOpen(false);
      navigate('/admin/games');
    } catch (e) {
      setSnackbar({
        message: e instanceof Error ? e.message : 'Erreur à la suppression',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }

  const selectedGenres = useMemo(() => {
    if (!form) return [];
    const byId = new Map(genresCatalog.map(x => [x.id, x]));
    return form.genreIds
      .map(id => byId.get(id))
      .filter(Boolean) as CatalogItem[];
  }, [form, genresCatalog]);

  const selectedPlatforms = useMemo(() => {
    if (!form) return [];
    const byId = new Map(platformsCatalog.map(x => [x.id, x]));
    return form.platformIds
      .map(id => byId.get(id))
      .filter(Boolean) as CatalogItem[];
  }, [form, platformsCatalog]);

  if (game === null && error) {
    return (
      <AdminLayout>
        <AdminPageHeader title="Jeu introuvable" />
        <ErrorAlert message={error} />
      </AdminLayout>
    );
  }

  if (game === null && loading) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  if (game === null || form === null) {
    return (
      <AdminLayout>
        <Typography>Jeu introuvable.</Typography>
      </AdminLayout>
    );
  }

  const readOnly = !canEdit || saving || catalogLoading;

  return (
    <AdminLayout>
      <AdminPageHeader title={game.name} />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ID {game.id}
        {game.igdb_id != null ? ` · IGDB ${game.igdb_id}` : ''} · Note moyenne{' '}
        {typeof game.average_rating === 'number'
          ? game.average_rating.toFixed(1)
          : '—'}{' '}
        ({game.rating_count} avis)
      </Typography>

      {game.cover_url ? (
        <Box
          component="img"
          src={game.cover_url}
          alt=""
          sx={{ maxWidth: 200, borderRadius: 2, mb: 3, display: 'block' }}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 720,
        }}
      >
        <TextField
          label="Nom (référence)"
          value={form.name}
          disabled={readOnly}
          onChange={e => setForm({ ...form, name: e.target.value })}
          fullWidth
        />
        <TextField
          label="Nom affiché (FR)"
          value={form.name_fr}
          disabled={readOnly}
          onChange={e => setForm({ ...form, name_fr: e.target.value })}
          fullWidth
        />
        <TextField
          label="Description"
          value={form.description}
          disabled={readOnly}
          onChange={e => setForm({ ...form, description: e.target.value })}
          fullWidth
          multiline
          minRows={4}
        />
        <TextField
          select
          label="Statut"
          value={form.status}
          disabled={readOnly}
          onChange={e => setForm({ ...form, status: e.target.value })}
          fullWidth
        >
          {STATUS_OPTIONS.map(o => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="URL de couverture"
          value={form.cover_url}
          disabled={readOnly}
          onChange={e => setForm({ ...form, cover_url: e.target.value })}
          fullWidth
        />
        <TextField
          label="Date de sortie"
          type="date"
          value={form.release_date ? form.release_date.slice(0, 10) : ''}
          disabled={readOnly}
          onChange={e => setForm({ ...form, release_date: e.target.value })}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Joueurs min"
            value={form.min_players}
            disabled={readOnly}
            onChange={e => setForm({ ...form, min_players: e.target.value })}
            sx={{ flex: 1, minWidth: 120 }}
          />
          <TextField
            label="Joueurs max"
            value={form.max_players}
            disabled={readOnly}
            onChange={e => setForm({ ...form, max_players: e.target.value })}
            sx={{ flex: 1, minWidth: 120 }}
          />
          <TextField
            label="Âge min"
            value={form.min_age}
            disabled={readOnly}
            onChange={e => setForm({ ...form, min_age: e.target.value })}
            sx={{ flex: 1, minWidth: 120 }}
          />
        </Box>

        <TextField
          select
          label="Éditeur"
          value={String(form.publisherId)}
          disabled={readOnly}
          onChange={e =>
            setForm({
              ...form,
              publisherId: Number(e.target.value),
            })
          }
          fullWidth
        >
          {publishersCatalog.map(p => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          multiple
          options={genresCatalog}
          getOptionLabel={o => o.name}
          value={selectedGenres}
          disabled={readOnly}
          onChange={(_, v) => setForm({ ...form, genreIds: v.map(x => x.id) })}
          renderInput={params => <TextField {...params} label="Genres" />}
        />
        <Autocomplete
          multiple
          options={platformsCatalog}
          getOptionLabel={o => o.name}
          value={selectedPlatforms}
          disabled={readOnly}
          onChange={(_, v) =>
            setForm({ ...form, platformIds: v.map(x => x.id) })
          }
          renderInput={params => <TextField {...params} label="Plateformes" />}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 4, flexWrap: 'wrap' }}>
        {canEdit ? (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || catalogLoading}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            color="error"
            variant="outlined"
            onClick={() => setDeleteOpen(true)}
          >
            Supprimer
          </Button>
        ) : null}
      </Box>

      <DeleteGameModal
        open={deleteOpen}
        gameName={game.name}
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
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
    </AdminLayout>
  );
}
