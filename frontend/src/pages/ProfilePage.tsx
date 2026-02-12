import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
  shellBg: '#fff7f7',
  cardBg: '#ffffff',
  sectionBg: '#fffafa',
  border: '#f1c7c7',
  softBorder: '#f7dddd',
  title: '#141414',
  text: '#2b2b2b',
  muted: '#6e6e73',
  lightMuted: '#8b8b92',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  overlay: 'rgba(0, 0, 0, 0.28)',
  dialogBg: '#fff9f9',
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

  const topLabelSx = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.7,
    textTransform: 'uppercase' as const,
    color: profileColors.lightMuted,
    mb: 1,
  };

  const cardSx = {
    borderRadius: 5,
    border: `1px solid ${profileColors.softBorder}`,
    backgroundColor: profileColors.cardBg,
    boxShadow: '0 12px 28px rgba(0,0,0,0.045)',
    p: 3,
    height: '100%',
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 3.5,
      backgroundColor: '#fff',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: profileColors.pageBg,
        px: { xs: 2, md: 5, lg: 8 },
        py: { xs: 2, md: 4 },
      }}
    >
      <Box component="main" sx={{ maxWidth: 1280, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: profileColors.shellBg,
            border: `1px solid ${profileColors.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                color: profileColors.title,
                letterSpacing: 0.2,
                mb: 2,
              }}
            >
              Ludokan
            </Typography>

            <Box sx={{ position: 'relative', mb: { xs: 9, md: 10 } }}>
              <Box
                component="img"
                src={zeldaBanner}
                alt="Zelda Banner"
                sx={{
                  width: '100%',
                  height: { xs: 220, sm: 280, md: 340 },
                  objectFit: 'cover',
                  borderRadius: 6,
                  display: 'block',
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 6,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.34) 100%)',
                }}
              />

              <Paper
                elevation={0}
                sx={{
                  position: 'absolute',
                  left: { xs: 16, md: 24 },
                  right: { xs: 16, md: 24 },
                  bottom: { xs: -82, md: -72 },
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.96)',
                  border: `1px solid ${profileColors.softBorder}`,
                  boxShadow: '0 18px 44px rgba(0,0,0,0.08)',
                  px: { xs: 2, md: 3 },
                  py: { xs: 2, md: 2.5 },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: 2,
                      flexDirection: { xs: 'column', sm: 'row' },
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
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        flexShrink: 0,
                        '&:hover .avatar-hover': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: '100%',
                          height: '100%',
                          border: '5px solid white',
                          boxShadow: '0 14px 32px rgba(0,0,0,0.16)',
                          fontSize: 42,
                          bgcolor: profileColors.accent,
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
                          fontWeight: 700,
                          opacity: 0,
                          transition: '0.2s ease',
                          textAlign: 'center',
                          px: 1,
                        }}
                      >
                        Changer l’avatar
                      </Box>
                    </Box>

                    <Box sx={{ maxWidth: 620 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: 26, md: 32 },
                          fontWeight: 900,
                          color: profileColors.title,
                          lineHeight: 1.1,
                          letterSpacing: -0.4,
                        }}
                      >
                        {loading ? '...' : user?.pseudo || 'Utilisateur'}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.8,
                          color: profileColors.muted,
                          fontSize: 15.5,
                          fontWeight: 500,
                        }}
                      >
                        {loading ? '...' : user?.email || 'Email non renseigné'}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 1.4,
                          color: profileColors.text,
                          fontSize: 15,
                          lineHeight: 1.7,
                        }}
                      >
                        {loading
                          ? '...'
                          : user?.description_courte ||
                            'Ajoute une petite description pour personnaliser ton profil.'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}>
                    <SecondaryButton onClick={handleEditOpen}>
                      Modifier le profil
                    </SecondaryButton>
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' },
                gap: 2.2,
                mb: 3,
              }}
            >
              <Paper sx={cardSx}>
                <Typography sx={topLabelSx}>Présentation</Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 800,
                    fontSize: 20,
                    mb: 1,
                    letterSpacing: -0.2,
                  }}
                >
                  Profil joueur
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.text,
                    lineHeight: 1.75,
                    fontSize: 15,
                  }}
                >
                  {loading
                    ? '...'
                    : user?.description_courte ||
                      'Ajoute une petite description pour personnaliser ton profil.'}
                </Typography>
              </Paper>

              <Paper sx={cardSx}>
                <Typography sx={topLabelSx}>Identité</Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 800,
                    fontSize: 20,
                    mb: 1,
                    letterSpacing: -0.2,
                  }}
                >
                  {loading ? '...' : user?.first_name || 'N/A'}{' '}
                  {loading ? '' : user?.last_name || ''}
                </Typography>
                <Typography
                  sx={{ color: profileColors.text, mb: 0.7, fontSize: 15 }}
                >
                  <strong>Pseudo :</strong>{' '}
                  {loading ? '...' : user?.pseudo || 'N/A'}
                </Typography>
                <Typography sx={{ color: profileColors.text, fontSize: 15 }}>
                  <strong>Email :</strong>{' '}
                  {loading ? '...' : user?.email || 'N/A'}
                </Typography>
              </Paper>

              <Paper sx={cardSx}>
                <Typography sx={topLabelSx}>Compte</Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 800,
                    fontSize: 20,
                    mb: 1,
                    letterSpacing: -0.2,
                  }}
                >
                  Inscrit depuis
                </Typography>
                <Typography sx={{ color: profileColors.text, fontSize: 15 }}>
                  {loading
                    ? '...'
                    : user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                </Typography>
              </Paper>
            </Box>

            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 900,
                color: profileColors.title,
                letterSpacing: -0.2,
              }}
            >
              Statistiques
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                gap: 2.2,
                mb: 3.5,
              }}
            >
              <Paper sx={cardSx}>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    mb: 1.5,
                  }}
                >
                  Prénom
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 28,
                    fontWeight: 900,
                    textAlign: 'center',
                    letterSpacing: -0.4,
                  }}
                >
                  {loading ? '...' : user?.first_name || 'N/A'}
                </Typography>
              </Paper>

              <Paper sx={cardSx}>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    mb: 1.5,
                  }}
                >
                  Nom
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 28,
                    fontWeight: 900,
                    textAlign: 'center',
                    letterSpacing: -0.4,
                  }}
                >
                  {loading ? '...' : user?.last_name || 'N/A'}
                </Typography>
              </Paper>

              <Paper sx={cardSx}>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 0.7,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    mb: 1.5,
                  }}
                >
                  Date d’inscription
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontSize: 22,
                    fontWeight: 900,
                    textAlign: 'center',
                    letterSpacing: -0.3,
                  }}
                >
                  {loading
                    ? '...'
                    : user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                </Typography>
              </Paper>
            </Box>

            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 6,
                boxShadow: '0 14px 34px rgba(0,0,0,0.05)',
                border: `1px solid ${profileColors.softBorder}`,
                backgroundColor: profileColors.sectionBg,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    color: profileColors.title,
                    letterSpacing: -0.2,
                  }}
                >
                  Jeux par statut
                </Typography>

                <Typography
                  sx={{
                    color: profileColors.muted,
                    fontSize: 14.5,
                    fontWeight: 500,
                  }}
                >
                  Retrouve facilement ta bibliothèque personnelle
                </Typography>
              </Box>

              <Divider sx={{ mb: 2, borderColor: profileColors.softBorder }} />

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
            borderRadius: 6,
            boxShadow: '0 26px 60px rgba(0,0,0,0.16)',
            backgroundColor: profileColors.dialogBg,
            border: `1px solid ${profileColors.border}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: profileColors.title,
            pb: 1,
            letterSpacing: -0.2,
          }}
        >
          Modifier mon profil
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.2, pt: 1 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
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
                  '&:hover .modal-avatar-hover': {
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
                    fontSize: 40,
                    boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
                    bgcolor: profileColors.accent,
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
                    fontWeight: 700,
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
                color: profileColors.muted,
                mb: 0.5,
                fontSize: 12.5,
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
              sx={fieldSx}
            />
            <TextField
              label="Prénom"
              name="first_name"
              fullWidth
              value={form.first_name}
              onChange={handleChange}
              sx={fieldSx}
            />
            <TextField
              label="Nom"
              name="last_name"
              fullWidth
              value={form.last_name}
              onChange={handleChange}
              sx={fieldSx}
            />
            <TextField
              label="Description"
              name="description_courte"
              fullWidth
              multiline
              minRows={3}
              value={form.description_courte}
              onChange={handleChange}
              sx={fieldSx}
            />

            <Box
              sx={{
                p: 2,
                borderRadius: 4,
                backgroundColor: '#fff',
                border: `1px solid ${profileColors.softBorder}`,
              }}
            >
              <Typography variant="caption" sx={{ color: profileColors.muted }}>
                Formats autorisés : JPG, PNG, WEBP — Taille max : 2 MB
              </Typography>

              {avatarFile && (
                <Typography
                  variant="body2"
                  sx={{ mt: 1, fontWeight: 700, color: profileColors.title }}
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

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => modalAvatarInputRef.current?.click()}
                sx={{
                  borderRadius: 999,
                  px: 2.5,
                  borderColor: profileColors.accent,
                  color: profileColors.accentDark,
                  fontWeight: 700,
                  '&:hover': {
                    borderColor: profileColors.accentDark,
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
                sx={{ borderRadius: 999, px: 2.5, fontWeight: 700 }}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleEditClose}
            sx={{
              borderRadius: 999,
              color: profileColors.title,
              px: 2.5,
              fontWeight: 700,
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 999,
              boxShadow: 'none',
              px: 3,
              fontWeight: 800,
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
