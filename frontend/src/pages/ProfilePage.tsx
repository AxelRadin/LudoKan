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
    return () => URL.revokeObjectURL(objectUrl);
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
    if (!ALLOWED_AVATAR_TYPES.includes(file.type))
      return 'Format invalide. Seuls les fichiers JPG, PNG et WEBP sont autorisés.';
    if (file.size > MAX_AVATAR_SIZE)
      return 'Le fichier est trop volumineux. Taille maximale autorisée : 2 MB.';
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
    setForm(prev => ({ ...prev, avatar_url: '' }));
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
        if (avatarFile) dataToSend.append('avatar', avatarFile);
        if (removeAvatar) dataToSend.append('remove_avatar', 'true');
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

  /* ─── Style tokens ─── */

  const labelSx = {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: profileColors.lightMuted,
    mb: 0.75,
    display: 'block',
  };

  const cardSx = {
    borderRadius: 4,
    border: `1px solid ${profileColors.softBorder}`,
    backgroundColor: profileColors.cardBg,
    p: '22px 26px',
    height: '100%',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'box-shadow 0.18s ease',
    '&:hover': {
      boxShadow: '0 4px 14px rgba(0,0,0,0.07)',
    },
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      backgroundColor: '#ffffff',
      fontSize: 14.5,
      '& fieldset': { borderColor: profileColors.softBorder },
      '&:hover fieldset': { borderColor: profileColors.border },
      '&.Mui-focused fieldset': { borderColor: profileColors.border },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: profileColors.muted },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: profileColors.pageBg,
        px: { xs: 2, md: 5, lg: 8 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box component="main" sx={{ maxWidth: 1200, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            backgroundColor: profileColors.shellBg,
            border: `1px solid ${profileColors.border}`,
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ p: { xs: 2.5, md: 4 } }}>
            {/* Wordmark */}
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 17,
                color: profileColors.title,
                letterSpacing: -0.3,
                mb: 3,
                opacity: 0.75,
              }}
            >
              Ludokan
            </Typography>

            {/* ── Hero banner ── */}
            <Box sx={{ position: 'relative', mb: { xs: 10, md: 11 } }}>
              <Box
                component="img"
                src={zeldaBanner}
                alt="Banner"
                sx={{
                  width: '100%',
                  height: { xs: 200, sm: 260, md: 320 },
                  objectFit: 'cover',
                  borderRadius: 4,
                  display: 'block',
                }}
              />

              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 4,
                  background:
                    'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.30) 100%)',
                }}
              />

              {/* Floating profile card */}
              <Paper
                elevation={0}
                sx={{
                  position: 'absolute',
                  left: { xs: 12, md: 20 },
                  right: { xs: 12, md: 20 },
                  bottom: { xs: -88, md: -80 },
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  border: `1px solid ${profileColors.softBorder}`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  px: { xs: 2.5, md: 3.5 },
                  py: 2.5,
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
                      gap: 2.5,
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}
                  >
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
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
                        flexShrink: 0,
                        '&:hover .avatar-overlay': { opacity: 1 },
                      }}
                    >
                      <Avatar
                        sx={{
                          width: '100%',
                          height: '100%',
                          border: '3px solid white',
                          outline: `1.5px solid ${profileColors.softBorder}`,
                          boxShadow: '0 3px 12px rgba(0,0,0,0.10)',
                          fontSize: 36,
                          bgcolor: profileColors.accent,
                        }}
                        src={displayedAvatar}
                        alt={user?.pseudo}
                      >
                        {user?.pseudo?.[0]?.toUpperCase() || 'U'}
                      </Avatar>

                      <Box
                        className="avatar-overlay"
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 600,
                          opacity: 0,
                          transition: 'opacity 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        Changer
                      </Box>
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: { xs: 22, md: 28 },
                          fontWeight: 800,
                          color: profileColors.title,
                          lineHeight: 1.15,
                          letterSpacing: -0.4,
                        }}
                      >
                        {loading ? '...' : user?.pseudo || 'Utilisateur'}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          color: profileColors.muted,
                          fontSize: 13.5,
                          fontWeight: 400,
                        }}
                      >
                        {loading ? '...' : user?.email}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 1,
                          color: profileColors.text,
                          fontSize: 14,
                          lineHeight: 1.65,
                          maxWidth: 500,
                          opacity: 0.8,
                        }}
                      >
                        {loading
                          ? '...'
                          : user?.description_courte ||
                            'Ajoute une petite description pour personnaliser ton profil.'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      alignSelf: { xs: 'stretch', md: 'center' },
                      flexShrink: 0,
                    }}
                  >
                    <SecondaryButton onClick={handleEditOpen}>
                      Modifier le profil
                    </SecondaryButton>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* ── Info cards ── */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.3fr 1fr 1fr' },
                gap: 2,
                mb: 3,
              }}
            >
              <Paper sx={cardSx}>
                <Typography component="span" sx={labelSx}>
                  Présentation
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 700,
                    fontSize: 16,
                    mb: 1.25,
                    letterSpacing: -0.1,
                  }}
                >
                  Profil joueur
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.text,
                    lineHeight: 1.75,
                    fontSize: 14,
                    opacity: 0.85,
                  }}
                >
                  {loading
                    ? '...'
                    : user?.description_courte ||
                      'Ajoute une petite description pour personnaliser ton profil.'}
                </Typography>
              </Paper>

              <Paper sx={cardSx}>
                <Typography component="span" sx={labelSx}>
                  Identité
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 700,
                    fontSize: 16,
                    mb: 1.25,
                    letterSpacing: -0.1,
                  }}
                >
                  {loading
                    ? '...'
                    : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                      'N/A'}
                </Typography>
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}
                >
                  {[
                    { label: 'Pseudo', value: user?.pseudo },
                    { label: 'Email', value: user?.email },
                  ].map(({ label, value }) => (
                    <Box
                      key={label}
                      sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}
                    >
                      <Typography
                        sx={{
                          color: profileColors.lightMuted,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 0.8,
                          textTransform: 'uppercase',
                          minWidth: 48,
                          flexShrink: 0,
                        }}
                      >
                        {label}
                      </Typography>
                      <Typography
                        sx={{
                          color: profileColors.text,
                          fontSize: 13.5,
                          wordBreak: 'break-all',
                        }}
                      >
                        {loading ? '...' : value || 'N/A'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={cardSx}>
                <Typography component="span" sx={labelSx}>
                  Compte
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.title,
                    fontWeight: 700,
                    fontSize: 16,
                    mb: 1.25,
                    letterSpacing: -0.1,
                  }}
                >
                  Membre depuis
                </Typography>
                <Typography
                  sx={{
                    color: profileColors.text,
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {loading
                    ? '...'
                    : user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'N/A'}
                </Typography>
              </Paper>
            </Box>

            {/* ── Statistiques ── */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: profileColors.title,
                    letterSpacing: -0.2,
                    fontSize: 16,
                  }}
                >
                  Statistiques
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 1,
                    backgroundColor: profileColors.softBorder,
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 2,
                }}
              >
                {[
                  { label: 'Prénom', value: user?.first_name },
                  { label: 'Nom', value: user?.last_name },
                  {
                    label: "Date d'inscription",
                    value: user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('fr-FR')
                      : null,
                  },
                ].map(({ label, value }) => (
                  <Paper
                    key={label}
                    elevation={0}
                    sx={{
                      ...cardSx,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      py: 3,
                      gap: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        color: profileColors.lightMuted,
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        color: profileColors.title,
                        fontSize: label === "Date d'inscription" ? 19 : 24,
                        fontWeight: 800,
                        letterSpacing: -0.2,
                      }}
                    >
                      {loading ? '...' : value || 'N/A'}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>

            {/* ── Bibliothèque ── */}
            <Paper
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 4,
                border: `1px solid ${profileColors.softBorder}`,
                backgroundColor: profileColors.sectionBg,
                boxShadow: 'none',
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
                <Box>
                  <Typography component="span" sx={{ ...labelSx, mb: 0.25 }}>
                    Bibliothèque
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: profileColors.title,
                      letterSpacing: -0.2,
                      fontSize: 16,
                    }}
                  >
                    Jeux par statut
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    color: profileColors.muted,
                    fontSize: 13.5,
                    fontWeight: 400,
                  }}
                >
                  Ta collection personnelle
                </Typography>
              </Box>

              <Divider
                sx={{ mb: 2.5, borderColor: profileColors.softBorder }}
              />

              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <GameList games={gamesEnCours} title="En cours" />
                <GameList games={gamesTermines} title="Terminés" />
                <GameList games={gamesEnvie} title="Envie d'y jouer" />
              </Box>
            </Paper>
          </Box>
        </Paper>
      </Box>

      {/* ── Dialog ── */}
      <Dialog
        open={editOpen}
        onClose={handleEditClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 5,
            boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
            backgroundColor: profileColors.dialogBg,
            border: `1px solid ${profileColors.border}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            color: profileColors.title,
            pb: 0.5,
            letterSpacing: -0.2,
            fontSize: 19,
          }}
        >
          Modifier mon profil
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                py: 1,
              }}
            >
              <input
                ref={modalAvatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handleFileChange}
              />

              <Box
                onClick={() => modalAvatarInputRef.current?.click()}
                sx={{
                  position: 'relative',
                  width: 88,
                  height: 88,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  '&:hover .modal-avatar-overlay': { opacity: 1 },
                }}
              >
                <Avatar
                  src={displayedAvatar}
                  alt="Prévisualisation"
                  sx={{
                    width: '100%',
                    height: '100%',
                    fontSize: 32,
                    boxShadow: '0 3px 12px rgba(0,0,0,0.10)',
                    bgcolor: profileColors.accent,
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
                    backgroundColor: 'rgba(0,0,0,0.32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  Changer
                </Box>
              </Box>

              <Typography
                sx={{
                  color: profileColors.muted,
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                Clique sur l'image pour changer ton avatar
              </Typography>
            </Box>

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
                p: '12px 16px',
                borderRadius: 3,
                backgroundColor: '#fff',
                border: `1px solid ${profileColors.softBorder}`,
              }}
            >
              <Typography sx={{ color: profileColors.muted, fontSize: 12 }}>
                Formats : JPG, PNG, WEBP — Max 2 MB
              </Typography>
              {avatarFile && (
                <Typography
                  sx={{
                    mt: 0.75,
                    fontWeight: 600,
                    color: profileColors.title,
                    fontSize: 13,
                  }}
                >
                  ✓ {avatarFile.name}
                </Typography>
              )}
              {removeAvatar && (
                <Typography sx={{ mt: 0.75, color: '#b45309', fontSize: 13 }}>
                  L'avatar sera supprimé.
                </Typography>
              )}
              {avatarError && (
                <Typography sx={{ mt: 0.75, color: '#dc2626', fontSize: 13 }}>
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
                  py: 0.8,
                  borderColor: profileColors.border,
                  color: profileColors.muted,
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: profileColors.border,
                    backgroundColor: profileColors.sectionBg,
                  },
                }}
              >
                Changer l'avatar
              </Button>

              <Button
                variant="text"
                color="error"
                onClick={handleRemoveAvatar}
                sx={{
                  borderRadius: 999,
                  px: 2.5,
                  py: 0.8,
                  fontWeight: 600,
                  fontSize: 13,
                  textTransform: 'none',
                  opacity: 0.7,
                }}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={handleEditClose}
            sx={{
              borderRadius: 999,
              color: profileColors.muted,
              px: 2.5,
              py: 0.8,
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              '&:hover': { backgroundColor: profileColors.softBorder },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              borderRadius: 999,
              px: 3.5,
              py: 0.9,
              fontWeight: 700,
              fontSize: 14,
              textTransform: 'none',
              backgroundColor: profileColors.accent,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: profileColors.accentDark,
                boxShadow: 'none',
              },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
