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
import { useEffect, useMemo, useState } from 'react';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import SecondaryButton from '../components/SecondaryButton';
import { apiGet, apiPatch } from '../services/api';
import defaultAvatar from '../assets/default/defaultAvatar.png';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const validationError = validateAvatarFile(selectedFile);

    if (validationError) {
      setAvatarError(validationError);
      setAvatarFile(null);
      setAvatarPreview('');
      e.target.value = '';
      return;
    }

    setAvatarError('');
    setRemoveAvatar(false);
    setAvatarFile(selectedFile);
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
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        ml: 25,
        mr: 25,
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: 8,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Box sx={{ p: 3, bgcolor: 'white', minHeight: '100vh' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Ludokan</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <img
              src="src/assets/default/zelda-banner.png"
              alt="Zelda Banner"
              style={{ width: '100%', maxHeight: 250, objectFit: 'cover' }}
            />
            <Box sx={{ position: 'relative', top: -60, left: 20 }}>
              <Avatar
                sx={{ width: 60, height: 60 }}
                src={user?.avatar_url || defaultAvatar}
                alt={user?.pseudo}
              />
              <SecondaryButton sx={{ mt: 1 }} onClick={handleEditOpen}>
                Modifier
              </SecondaryButton>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>
                {loading ? '...' : user?.description_courte || 'N/A'}
              </Typography>
              <Typography variant="caption">Description</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>{loading ? '...' : user?.pseudo || 'N/A'}</Typography>
              <Typography variant="caption">Pseudo</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>{loading ? '...' : user?.email || 'N/A'}</Typography>
              <Typography variant="caption">Email</Typography>
            </Paper>
          </Box>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Statistiques
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>
                {loading
                  ? '...'
                  : user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : 'N/A'}
              </Typography>
              <Typography variant="caption">Inscrit depuis</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>
                {loading ? '...' : user?.first_name || 'N/A'}
              </Typography>
              <Typography variant="caption">Prénom</Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2, textAlign: 'center' }}>
              <Typography>
                {loading ? '...' : user?.last_name || 'N/A'}
              </Typography>
              <Typography variant="caption">Nom</Typography>
            </Paper>
          </Box>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Jeux par statut
          </Typography>

          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 4 }}>
            <GameList games={gamesEnCours} title="En cours" />
            <GameList games={gamesTermines} title="Terminés" />
            <GameList games={gamesEnvie} title="Envie d'y jouer" />
          </Box>
        </Box>
      </Box>

      <Dialog open={editOpen} onClose={handleEditClose} fullWidth maxWidth="sm">
        <DialogTitle>Modifier mon profil</DialogTitle>

        <DialogContent>
          <TextField
            margin="dense"
            label="Pseudo"
            name="pseudo"
            fullWidth
            value={form.pseudo}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Prénom"
            name="first_name"
            fullWidth
            value={form.first_name}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Nom"
            name="last_name"
            fullWidth
            value={form.last_name}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Description"
            name="description_courte"
            fullWidth
            value={form.description_courte}
            onChange={handleChange}
          />

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2">Avatar</Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={displayedAvatar}
                alt="Prévisualisation avatar"
                sx={{ width: 72, height: 72 }}
              />

              <Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" component="label">
                    Choisir un avatar
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>

                  <Button
                    variant="text"
                    color="error"
                    onClick={handleRemoveAvatar}
                  >
                    Supprimer
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Formats autorisés : JPG, PNG, WEBP — Taille max : 2 MB
                </Typography>
              </Box>
            </Box>

            {avatarFile && (
              <Typography variant="caption">
                Fichier sélectionné : {avatarFile.name}
              </Typography>
            )}

            {removeAvatar && (
              <Typography variant="caption">
                L’avatar sera supprimé et remplacé par l’image par défaut.
              </Typography>
            )}

            {avatarError && (
              <Typography color="error" variant="caption">
                {avatarError}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleEditClose}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
