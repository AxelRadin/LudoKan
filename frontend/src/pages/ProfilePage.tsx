import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import SecondaryButton from '../components/SecondaryButton';
import { apiGet, apiPatch } from '../services/api';

const defaultAvatar = '';
const bannerUrl = '/zelda-banner.png';

type UserProfile = {
  pseudo: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  description_courte?: string;
  created_at?: string;
};

type UserGame = {
  id: number;
  status: string;
  date_added: string;
  game: {
    id: number;
    name: string;
    cover_url?: string;
    image?: string;
    publisher?: { name: string };
  };
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    pseudo: '',
    email: '',
    first_name: '',
    last_name: '',
    avatar_url: '',
    description_courte: '',
    created_at: '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [userGames, setUserGames] = useState<UserGame[]>([]);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const modalAvatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    apiGet('/api/me/')
      .then(data => {
        setUser(data);
        setForm({
          pseudo: data.pseudo || '',
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          avatar_url: data.avatar_url || '',
          description_courte: data.description_courte || '',
          created_at: data.created_at || '',
        });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    apiGet('/api/me/games/').then(res => {
      setUserGames(res.results || res || []);
    });
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  const displayedAvatar = useMemo(() => {
    if (removeAvatar) return defaultAvatar;
    if (avatarPreview) return avatarPreview;
    if (form.avatar_url) return form.avatar_url;
    if (user?.avatar_url) return user.avatar_url;
    return defaultAvatar;
  }, [removeAvatar, avatarPreview, form.avatar_url, user?.avatar_url]);

  const handleEditOpen = () => {
    setAvatarError('');
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(false);
    setForm({
      pseudo: user?.pseudo || '',
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      avatar_url: user?.avatar_url || '',
      description_courte: user?.description_courte || '',
      created_at: user?.created_at || '',
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarError('');
    setRemoveAvatar(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateAvatarFile = (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return 'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont autorisés.';
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return 'Le fichier est trop volumineux. Taille maximale autorisée : 2 MB.';
    }

    return '';
  };

  const applySelectedFile = (selectedFile?: File) => {
    if (!selectedFile) return;

    const validationError = validateAvatarFile(selectedFile);

    if (validationError) {
      setAvatarError(validationError);
      setAvatarFile(null);
      setAvatarPreview('');
      return;
    }

    setAvatarError('');
    setRemoveAvatar(false);
    setAvatarFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    applySelectedFile(selectedFile);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarError('');
    setRemoveAvatar(true);
    setForm(prev => ({
      ...prev,
      avatar_url: '',
    }));
  };

  const handleSave = async () => {
    try {
      let dataToSend: FormData | Record<string, string | undefined>;

      if (avatarFile || removeAvatar) {
        dataToSend = new FormData();
        dataToSend.append('pseudo', form.pseudo);
        dataToSend.append('first_name', form.first_name || '');
        dataToSend.append('last_name', form.last_name || '');
        dataToSend.append('description_courte', form.description_courte || '');

        if (avatarFile) {
          dataToSend.append('avatar', avatarFile);
        }

        if (removeAvatar) {
          dataToSend.append('remove_avatar', 'true');
        }
      } else {
        dataToSend = {
          pseudo: form.pseudo,
          first_name: form.first_name,
          last_name: form.last_name,
          description_courte: form.description_courte,
        };
      }

      const updated = await apiPatch('/api/me/', dataToSend);

      setUser(updated);
      setForm({
        pseudo: updated.pseudo || '',
        email: updated.email || '',
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        avatar_url: updated.avatar_url || '',
        description_courte: updated.description_courte || '',
        created_at: updated.created_at || '',
      });
      setEditOpen(false);
      setAvatarFile(null);
      setAvatarPreview('');
      setAvatarError('');
      setRemoveAvatar(false);
    } catch (err: any) {
      console.error('Erreur API:', err);
      alert('Erreur lors de la modification: ' + (err?.message || ''));
    }
  };

  const gamesEnCours: GameListItem[] = userGames
    .filter(ug => ug.status === 'EN_COURS')
    .map(ug => ({
      id: ug.game.id,
      name: ug.game.name,
      cover_url: ug.game.cover_url,
      image: ug.game.image,
      status: ug.status,
    }));

  const gamesTermines: GameListItem[] = userGames
    .filter(ug => ug.status === 'TERMINE')
    .map(ug => ({
      id: ug.game.id,
      name: ug.game.name,
      cover_url: ug.game.cover_url,
      image: ug.game.image,
      status: ug.status,
    }));

  const gamesEnvie: GameListItem[] = userGames
    .filter(ug => ug.status === 'ENVIE_DE_JOUER')
    .map(ug => ({
      id: ug.game.id,
      name: ug.game.name,
      cover_url: ug.game.cover_url,
      image: ug.game.image,
      status: ug.status,
    }));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'linear-gradient(180deg, #f8fafc 0%, #eef2ff 45%, #ffffff 100%)',
        px: { xs: 2, md: 6 },
        py: 4,
      }}
    >
      <Box component="main" sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: 6,
            border: '1px solid',
            borderColor: 'rgba(99, 102, 241, 0.12)',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
            backgroundColor: '#fff',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={bannerUrl}
              alt="Zelda Banner"
              sx={{
                width: '100%',
                height: { xs: 180, md: 260 },
                objectFit: 'cover',
                display: 'block',
                filter: 'saturate(1.05)',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.45) 100%)',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                left: { xs: 20, md: 32 },
                bottom: { xs: -54, md: -64 },
                display: 'flex',
                alignItems: 'flex-end',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  hidden
                  onChange={handleFileChange}
                />

                <Box
                  onClick={() => avatarInputRef.current?.click()}
                  sx={{
                    position: 'relative',
                    width: { xs: 108, md: 128 },
                    height: { xs: 108, md: 128 },
                    borderRadius: '50%',
                    cursor: 'pointer',
                    '&:hover .avatar-overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    src={displayedAvatar}
                    alt={user?.pseudo}
                    sx={{
                      width: '100%',
                      height: '100%',
                      fontSize: 40,
                      border: '4px solid white',
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.22)',
                      bgcolor: '#6366f1',
                    }}
                  >
                    {user?.pseudo?.[0]?.toUpperCase() || 'U'}
                  </Avatar>

                  <Box
                    className="avatar-overlay"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 13,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      textAlign: 'center',
                      px: 1,
                    }}
                  >
                    Cliquer pour changer
                  </Box>
                </Box>
              </Box>

              <Box sx={{ color: '#fff', mb: 1 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    textShadow: '0 2px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  {loading ? '...' : user?.pseudo || 'Mon profil'}
                </Typography>
                <Typography sx={{ opacity: 0.95 }}>
                  {loading ? '...' : user?.email || 'Email non renseigné'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ px: { xs: 2, md: 4 }, pt: { xs: 8, md: 10 }, pb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 2,
                flexDirection: { xs: 'column', md: 'row' },
                mb: 3,
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 800, color: '#0f172a' }}
                >
                  Ludokan
                </Typography>
                <Typography sx={{ color: '#64748b', mt: 0.5 }}>
                  Gère ton profil et personnalise ton avatar en un clic.
                </Typography>
              </Box>

              <SecondaryButton
                onClick={handleEditOpen}
                sx={{
                  borderRadius: 999,
                  px: 3,
                  py: 1,
                  fontWeight: 700,
                }}
              >
                Modifier le profil
              </SecondaryButton>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 2,
                mb: 4,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  background:
                    'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Description
                </Typography>
                <Typography sx={{ color: '#475569' }}>
                  {loading
                    ? '...'
                    : user?.description_courte || 'Aucune description'}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  background:
                    'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Identité
                </Typography>
                <Typography sx={{ color: '#475569', mb: 0.5 }}>
                  <strong>Pseudo :</strong>{' '}
                  {loading ? '...' : user?.pseudo || 'N/A'}
                </Typography>
                <Typography sx={{ color: '#475569' }}>
                  <strong>Email :</strong>{' '}
                  {loading ? '...' : user?.email || 'N/A'}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  background:
                    'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                }}
              >
                <Typography sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Statistiques
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`Prénom : ${loading ? '...' : user?.first_name || 'N/A'}`}
                    sx={{ borderRadius: 999 }}
                  />
                  <Chip
                    label={`Nom : ${loading ? '...' : user?.last_name || 'N/A'}`}
                    sx={{ borderRadius: 999 }}
                  />
                  <Chip
                    label={`Inscrit depuis : ${
                      loading
                        ? '...'
                        : user?.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'N/A'
                    }`}
                    sx={{ borderRadius: 999 }}
                  />
                </Box>
              </Paper>
            </Box>

            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                background: '#fff',
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: 800, color: '#0f172a' }}
              >
                Jeux par statut
              </Typography>

              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <GameList games={gamesEnCours} title="En cours" />
                <GameList games={gamesTermines} title="Terminés" />
                <GameList games={gamesEnvie} title="Envie d'y jouer" />
              </Box>
            </Paper>
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 5,
            p: 1,
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Modifier mon profil
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mb: 1,
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <input
                  ref={modalAvatarInputRef}
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  hidden
                  onChange={handleFileChange}
                />

                <Box
                  onClick={() => modalAvatarInputRef.current?.click()}
                  sx={{
                    position: 'relative',
                    width: 112,
                    height: 112,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    '&:hover .modal-avatar-overlay': {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    src={displayedAvatar}
                    alt="Prévisualisation avatar"
                    sx={{
                      width: '100%',
                      height: '100%',
                      fontSize: 36,
                      bgcolor: '#6366f1',
                      boxShadow: '0 12px 30px rgba(99, 102, 241, 0.28)',
                    }}
                  >
                    {form.pseudo?.[0]?.toUpperCase() || 'U'}
                  </Avatar>

                  <Box
                    className="modal-avatar-overlay"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 12,
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      textAlign: 'center',
                      px: 1,
                    }}
                  >
                    Cliquer pour uploader
                  </Box>
                </Box>

                <IconButton
                  onClick={() => modalAvatarInputRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    right: -4,
                    bottom: -4,
                    width: 36,
                    height: 36,
                    bgcolor: '#111827',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(15,23,42,0.25)',
                    '&:hover': {
                      bgcolor: '#1f2937',
                    },
                  }}
                >
                  +
                </IconButton>
              </Box>
            </Box>

            <Typography
              variant="body2"
              sx={{ textAlign: 'center', color: '#64748b', mb: 1 }}
            >
              Clique directement sur l’avatar pour choisir une image.
            </Typography>

            <TextField
              label="Pseudo"
              name="pseudo"
              fullWidth
              value={form.pseudo}
              onChange={handleChange}
            />

            <TextField
              label="Prénom"
              name="first_name"
              fullWidth
              value={form.first_name}
              onChange={handleChange}
            />

            <TextField
              label="Nom"
              name="last_name"
              fullWidth
              value={form.last_name}
              onChange={handleChange}
            />

            <TextField
              label="Description"
              name="description_courte"
              fullWidth
              multiline
              minRows={3}
              value={form.description_courte}
              onChange={handleChange}
            />

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
              }}
            >
              <Typography variant="caption" sx={{ color: '#475569' }}>
                Formats autorisés : JPG, PNG, WEBP — Taille max : 2 MB
              </Typography>

              {avatarFile && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, color: '#0f172a', fontWeight: 600 }}
                >
                  Fichier sélectionné : {avatarFile.name}
                </Typography>
              )}

              {removeAvatar && (
                <Typography variant="body2" sx={{ mt: 1, color: '#b45309' }}>
                  L’avatar sera supprimé et remplacé par le fallback visuel.
                </Typography>
              )}

              {avatarError && (
                <Typography variant="body2" sx={{ mt: 1, color: '#dc2626' }}>
                  {avatarError}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => modalAvatarInputRef.current?.click()}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                Changer l’avatar
              </Button>

              <Button
                variant="text"
                color="error"
                onClick={handleRemoveAvatar}
                sx={{ borderRadius: 999, px: 2.5 }}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleEditClose} sx={{ borderRadius: 999, px: 2.5 }}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 999,
              px: 3,
              fontWeight: 700,
              boxShadow: 'none',
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
