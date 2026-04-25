import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addGameToCollection,
  createCollection,
  deleteCollection,
  fetchMyCollections,
  removeGameFromCollection,
  updateCollection,
  type UserCollection,
} from '../api/collections';
import { fetchUserGames } from '../api/userGames';
import { apiPost } from '../services/api';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

type CollectionFormFields = {
  name: string;
  color: string;
  is_visible_on_profile: boolean;
};

const DEFAULT_COLOR = '#d32f2f';

function normalizeHexColor(input: string): string {
  const v = (input || '').trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  return '';
}

function toFields(collection?: UserCollection): CollectionFormFields {
  return {
    name: collection?.name ?? '',
    color: normalizeHexColor(collection?.color ?? '') || DEFAULT_COLOR,
    is_visible_on_profile: Boolean(collection?.is_visible_on_profile),
  };
}

type CollectionFormModalProps = Readonly<{
  open: boolean;
  mode: 'create' | 'edit';
  collection?: UserCollection;
  onClose: () => void;
  onSubmitted: (saved: UserCollection) => void | Promise<void>;
  submitLabel?: string;
  title?: string;
}>;

function CollectionFormModal({
  open,
  mode,
  collection,
  onClose,
  onSubmitted,
  submitLabel,
  title,
}: CollectionFormModalProps) {
  const [fields, setFields] = useState<CollectionFormFields>(() =>
    toFields(collection)
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFields(toFields(collection));
  }, [open, collection?.id]);

  const handleSubmit = async () => {
    const name = fields.name.trim();
    if (!name) return;
    setBusy(true);
    try {
      const payload = {
        name,
        color: normalizeHexColor(fields.color) || '',
        is_visible_on_profile: fields.is_visible_on_profile,
      };
      const saved =
        mode === 'create'
          ? await createCollection(payload)
          : await updateCollection(collection!.id, payload);
      await onSubmitted(saved);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
        {title ??
          (mode === 'create' ? 'Nouvelle collection' : 'Éditer la collection')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
          <TextField
            label="Nom"
            required
            fullWidth
            value={fields.name}
            onChange={e => setFields(p => ({ ...p, name: e.target.value }))}
            inputProps={{ sx: { fontFamily: FONT_BODY } }}
            InputLabelProps={{ sx: { fontFamily: FONT_BODY } }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              label="Couleur"
              value={fields.color}
              onChange={e =>
                setFields(p => ({
                  ...p,
                  color: e.target.value || DEFAULT_COLOR,
                }))
              }
              inputProps={{ sx: { fontFamily: FONT_BODY } }}
              InputLabelProps={{ sx: { fontFamily: FONT_BODY } }}
              sx={{ flex: 1 }}
            />
            <Tooltip title="Choisir une couleur" arrow>
              <Box
                component="input"
                type="color"
                value={normalizeHexColor(fields.color) || DEFAULT_COLOR}
                onChange={e =>
                  setFields(p => ({ ...p, color: e.target.value }))
                }
                sx={{
                  width: 46,
                  height: 46,
                  border: '1px solid #e0e0e0',
                  borderRadius: '10px',
                  background: 'transparent',
                  p: 0.5,
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={fields.is_visible_on_profile}
                onChange={(_, checked) =>
                  setFields(p => ({ ...p, is_visible_on_profile: checked }))
                }
              />
            }
            label={
              <Typography sx={{ fontFamily: FONT_BODY, fontSize: 14 }}>
                Visible sur mon profil public
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={busy}
          sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={busy || !fields.name.trim()}
          sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
        >
          {submitLabel ?? (mode === 'create' ? 'Créer' : 'Enregistrer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export type CreateCollectionModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onCreated: (c: UserCollection) => void | Promise<void>;
}>;

export function CreateCollectionModal({
  open,
  onClose,
  onCreated,
}: CreateCollectionModalProps) {
  return (
    <CollectionFormModal
      open={open}
      mode="create"
      onClose={onClose}
      onSubmitted={onCreated}
      title="Nouvelle collection"
      submitLabel="Créer"
    />
  );
}

export type ManageCollectionsModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function ManageCollectionsModal({
  open,
  onClose,
}: ManageCollectionsModalProps) {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<UserCollection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserCollection | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCollections(await fetchMyCollections());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };

  const displayCollections = useMemo(() => collections, [collections]);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          Gérer les collections
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Typography sx={{ fontFamily: FONT_BODY }}>Chargement…</Typography>
          ) : displayCollections.length === 0 ? (
            <Typography sx={{ fontFamily: FONT_BODY }}>
              Aucune collection à gérer.
            </Typography>
          ) : (
            <List disablePadding>
              {displayCollections.map(c => (
                <Box
                  key={c.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.5,
                  }}
                >
                  <ListItemText
                    primary={c.name}
                    secondary={`${c.games_count} jeu(x)`}
                    primaryTypographyProps={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                    }}
                    secondaryTypographyProps={{
                      fontFamily: FONT_BODY,
                      fontSize: 12,
                    }}
                  />
                  <Tooltip title="Éditer" arrow>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => setEditTarget(c)}
                        aria-label={`Éditer ${c.name}`}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {!c.is_system ? (
                    <Tooltip title="Supprimer" arrow>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={`Supprimer ${c.name}`}
                          color="error"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={onClose}
            sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: '14px' } }}
      >
        <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          Supprimer la collection ?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: FONT_BODY }}>
            Confirme la suppression de « {deleteTarget?.name} ».
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            sx={{ fontFamily: FONT_BODY }}
          >
            Annuler
          </Button>
          <Button
            onClick={() => void confirmDelete()}
            variant="contained"
            color="error"
            sx={{ fontFamily: FONT_BODY }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <CollectionFormModal
        open={Boolean(editTarget)}
        mode="edit"
        collection={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
        onSubmitted={async () => {
          await load();
        }}
        title="Éditer la collection"
        submitLabel="Enregistrer"
      />
    </>
  );
}

export type AddToCollectionModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  djangoGameId: number | null;
  ensureDjangoId: () => Promise<number | null>;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
  userGameHint?: { id?: number; collection_ids?: number[] } | null;
  onApplied: () => void | Promise<void>;
}>;

export function AddToCollectionModal({
  open,
  onClose,
  djangoGameId,
  ensureDjangoId,
  isAuthenticated,
  onRequireAuth,
  userGameHint,
  onApplied,
}: AddToCollectionModalProps) {
  const [step, setStep] = useState<'pick' | 'create'>('pick');
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadCollections = useCallback(async () => {
    setLoadingList(true);
    try {
      setCollections(await fetchMyCollections());
    } catch {
      setCollections([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setCreateOpen(false);
    if (isAuthenticated) void loadCollections();
  }, [open, isAuthenticated, loadCollections]);

  const resolveUserGameId = useCallback(
    async (
      gameId: number,
      createIfMissing: boolean
    ): Promise<number | null> => {
      if (userGameHint?.id) return userGameHint.id;
      const games = await fetchUserGames();
      const row = games.find(g => g.game.id === gameId);
      if (row?.id != null) return row.id;
      if (!createIfMissing) return null;
      const created = (await apiPost('/api/me/games/', {
        game_id: gameId,
        status: 'ENVIE_DE_JOUER',
      })) as { id: number };
      return created.id;
    },
    [userGameHint?.id]
  );

  const handlePickCollection = async (col: UserCollection) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    const did = djangoGameId ?? (await ensureDjangoId());
    if (!did) return;
    const inCol = (userGameHint?.collection_ids ?? []).includes(col.id);
    if (inCol) return;

    setBusyId(col.id);
    try {
      const userGameId = await resolveUserGameId(did, true);
      if (userGameId == null) return;
      await addGameToCollection(col.id, userGameId);
      await onApplied();
      onClose();
    } catch {
      alert('Impossible d’ajouter le jeu à cette collection.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFromCollection = async (col: UserCollection) => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    const did = djangoGameId ?? (await ensureDjangoId());
    if (!did) return;

    setBusyId(col.id);
    try {
      const userGameId = await resolveUserGameId(did, false);
      if (userGameId == null) return;
      await removeGameFromCollection(col.id, userGameId);
      await onApplied();
      await loadCollections();
    } catch {
      alert('Impossible de retirer le jeu de cette collection.');
    } finally {
      setBusyId(null);
    }
  };

  const openAuthThenModal = () => onRequireAuth();

  return (
    <>
      <Dialog
        open={open}
        onClose={busyId != null ? undefined : onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        {step === 'pick' ? (
          <>
            <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
              Ajouter à une collection
            </DialogTitle>
            <DialogContent>
              {!isAuthenticated ? (
                <Typography sx={{ fontFamily: FONT_BODY }}>
                  Connecte-toi pour gérer tes collections.
                </Typography>
              ) : loadingList ? (
                <Typography sx={{ fontFamily: FONT_BODY }}>
                  Chargement…
                </Typography>
              ) : (
                <>
                  <List dense disablePadding sx={{ py: 0 }}>
                    {collections.map(c => {
                      const already = (
                        userGameHint?.collection_ids ?? []
                      ).includes(c.id);
                      return (
                        <Box
                          key={c.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <ListItemButton
                            disabled={busyId != null || already}
                            onClick={() => void handlePickCollection(c)}
                            sx={{ borderRadius: 1, mb: 0.5, flex: 1 }}
                          >
                            <ListItemText
                              primary={c.name}
                              secondary={
                                already
                                  ? 'Déjà dans cette collection'
                                  : `${c.games_count} jeu(x)`
                              }
                              primaryTypographyProps={{
                                fontFamily: FONT_BODY,
                                fontWeight: 600,
                              }}
                              secondaryTypographyProps={{
                                fontFamily: FONT_BODY,
                                fontSize: 12,
                              }}
                            />
                            {busyId === c.id ? (
                              <Typography variant="caption">…</Typography>
                            ) : null}
                          </ListItemButton>
                          {already ? (
                            <Tooltip title="Retirer de cette collection" arrow>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    void handleRemoveFromCollection(c)
                                  }
                                  disabled={busyId != null}
                                  aria-label={`Retirer de ${c.name}`}
                                >
                                  <PlaylistRemoveIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </Box>
                      );
                    })}
                  </List>
                  <Button
                    fullWidth
                    variant="outlined"
                    sx={{ mt: 2, fontFamily: FONT_BODY, borderRadius: 2 }}
                    onClick={() => setStep('create')}
                  >
                    Créer une collection…
                  </Button>
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={onClose}
                sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
              >
                Fermer
              </Button>
              {!isAuthenticated ? (
                <Button
                  variant="contained"
                  onClick={openAuthThenModal}
                  sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
                >
                  Connexion
                </Button>
              ) : null}
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => setStep('pick')}
                sx={{ minWidth: 0, fontFamily: FONT_BODY }}
              >
                Retour
              </Button>
              <span>Nouvelle collection</span>
            </DialogTitle>
            <DialogContent>
              <Typography
                sx={{ fontFamily: FONT_BODY, color: 'text.secondary' }}
              >
                Utilise le formulaire de création, puis le jeu sera ajouté
                automatiquement.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 2, fontFamily: FONT_BODY, borderRadius: 2 }}
                onClick={() => setCreateOpen(true)}
              >
                Ouvrir le formulaire
              </Button>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                onClick={() => setStep('pick')}
                sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
              >
                Retour
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <CollectionFormModal
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmitted={async created => {
          const did = djangoGameId ?? (await ensureDjangoId());
          if (!did) return;
          const userGameId = await resolveUserGameId(did, true);
          if (userGameId == null) return;
          await addGameToCollection(created.id, userGameId);
          await onApplied();
          await loadCollections();
          onClose();
        }}
        title="Nouvelle collection"
        submitLabel="Créer et ajouter le jeu"
      />
    </>
  );
}
