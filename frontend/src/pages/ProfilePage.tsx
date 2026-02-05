import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import SecondaryButton from '../components/SecondaryButton';
import { apiGet, apiPatch } from '../services/api';
import zeldaBanner from '../assets/default/zelda-banner.png';

const defaultAvatar = '';

const profileColors = {
  pageBg: '#ffd3d3',
  mainCardBg: '#fafafa',
  sectionBg: '#fffafa',
  whiteCard: '#ffffff',
  border: '#f3bcbc',
  softBorder: '#f6d4d4',
  title: '#8b1e1e',
  subtitle: '#b23a48',
  textMuted: '#7a4b4b',
  overlay: 'rgba(139, 30, 30, 0.45)',
  dialogBg: '#fff7f7',
};

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

  const infoCardSx = {
    flex: 1,
    p: 2.5,
    textAlign: 'center',
    borderRadius: 4,
    boxShadow: '0 6px 18px rgba(139, 30, 30, 0.08)',
    border: `1px solid ${profileColors.softBorder}`,
    backgroundColor: profileColors.whiteCard,
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: profileColors.pageBg,
        px: { xs: 2, md: 6 },
        py: 4,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxWidth: 1200,
          width: '100%',
          mx: 'auto',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            overflow: 'hidden',
            borderRadius: 5,
            border: `1px solid ${profileColors.border}`,
            boxShadow: '0 12px 30px rgba(139, 30, 30, 0.08)',
            backgroundColor: profileColors.mainCardBg,
          }}
        >
          <Box sx={{ p: 3, bgcolor: profileColors.mainCardBg }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: profileColors.title }}
              >
                Ludokan
              </Typography>
            </Box>

            <Box sx={{ mb: 6, position: 'relative' }}>
              <Box
                component="img"
                src={zeldaBanner}
                alt="Zelda Banner"
                sx={{
                  width: '100%',
                  maxHeight: 260,
                  height: { xs: 180, md: 260 },
                  objectFit: 'cover',
                  borderRadius: 4,
                  display: 'block',
                  border: `1px solid ${profileColors.border}`,
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 20, md: 28 },
                  bottom: -45,
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 2,
                }}
              >
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
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    '&:hover .avatar-hover': {
                      opacity: 1,
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 96,
                      height: 96,
                      border: '4px solid white',
                      boxShadow: '0 10px 24px rgba(139, 30, 30, 0.18)',
                      fontSize: 34,
                      bgcolor: '#d32f2f',
                    }}
                    src={displayedAvatar}
                    alt={user?.pseudo}
                  >
                    {user?.pseudo?.[0]?.toUpperCase() || 'U'}
                  </Avatar>

                  <Box
                    className="avatar-hover"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      backgroundColor: profileColors.overlay,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: 0,
                      transition: '0.2s ease',
                      textAlign: 'center',
                      px: 1,
                    }}
                  >
                    Changer
                  </Box>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <SecondaryButton onClick={handleEditOpen}>
                    Modifier
                  </SecondaryButton>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading ? '...' : user?.description_courte || 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Description
                </Typography>
              </Paper>

              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading ? '...' : user?.pseudo || 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Pseudo
                </Typography>
              </Paper>

              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading ? '...' : user?.email || 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Email
                </Typography>
              </Paper>
            </Box>

            <Typography
              variant="h6"
              sx={{ mb: 1.5, fontWeight: 700, color: profileColors.title }}
            >
              Statistiques
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading
                    ? '...'
                    : user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Inscrit depuis
                </Typography>
              </Paper>

              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading ? '...' : user?.first_name || 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Prénom
                </Typography>
              </Paper>

              <Paper sx={infoCardSx}>
                <Typography
                  sx={{ fontWeight: 600, mb: 0.5, color: profileColors.title }}
                >
                  {loading ? '...' : user?.last_name || 'N/A'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: profileColors.textMuted }}
                >
                  Nom
                </Typography>
              </Paper>
            </Box>

            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                boxShadow: '0 6px 18px rgba(139, 30, 30, 0.06)',
                border: `1px solid ${profileColors.softBorder}`,
                backgroundColor: profileColors.sectionBg,
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, fontWeight: 700, color: profileColors.title }}
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
            borderRadius: 4,
            boxShadow: '0 18px 45px rgba(139, 30, 30, 0.12)',
            backgroundColor: profileColors.dialogBg,
            border: `1px solid ${profileColors.border}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: profileColors.title }}>
          Modifier mon profil
        </DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
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
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  '&:hover .modal-avatar-hover': {
                    opacity: 1,
                  },
                }}
              >
                <Avatar
                  src={displayedAvatar}
                  alt="Prévisualisation avatar"
                  sx={{
                    width: 100,
                    height: 100,
                    fontSize: 34,
                    boxShadow: '0 10px 24px rgba(139, 30, 30, 0.14)',
                    bgcolor: '#d32f2f',
                  }}
                >
                  {form.pseudo?.[0]?.toUpperCase() || 'U'}
                </Avatar>

                <Box
                  className="modal-avatar-hover"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    backgroundColor: profileColors.overlay,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    opacity: 0,
                    transition: '0.2s ease',
                    textAlign: 'center',
                    px: 1,
                  }}
                >
                  Cliquer pour changer
                </Box>
              </Box>
            </Box>

            <Typography
              variant="caption"
              sx={{
                textAlign: 'center',
                color: profileColors.textMuted,
                mb: 1,
              }}
            >
              Clique directement sur l’image pour importer un avatar
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
                backgroundColor: '#fff',
                border: `1px solid ${profileColors.softBorder}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: profileColors.textMuted }}
              >
                Formats autorisés : JPG, PNG, WEBP — Taille max : 2 MB
              </Typography>

              {avatarFile && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontWeight: 600, color: profileColors.title }}
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
                sx={{
                  borderRadius: 999,
                  borderColor: '#d32f2f',
                  color: '#b71c1c',
                  '&:hover': {
                    borderColor: '#b71c1c',
                    backgroundColor: '#fff1f1',
                  },
                }}
              >
                Changer l’avatar
              </Button>
              <Button
                variant="text"
                color="error"
                onClick={handleRemoveAvatar}
                sx={{ borderRadius: 999 }}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleEditClose}
            sx={{
              borderRadius: 999,
              color: profileColors.title,
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="error"
            sx={{ borderRadius: 999, boxShadow: 'none' }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
