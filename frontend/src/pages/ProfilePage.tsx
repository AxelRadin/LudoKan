import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, useRef, type ChangeEvent } from 'react';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import SecondaryButton from '../components/SecondaryButton';
import { apiGet, apiPatch } from '../services/api';
import zeldaBanner from '../assets/default/zelda-banner.png';

/* ─── Google Fonts injection ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

const defaultAvatar = '';

const C = {
  pageBg: '#ffd3d3',
  shellBg: '#fff7f7',
  cardBg: 'rgba(255,255,255,0.72)',
  border: '#f1c7c7',
  softBorder: 'rgba(241,199,199,0.5)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#a0a0a8',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentGlow: 'rgba(211,47,47,0.15)',
  glass: 'rgba(255,250,250,0.78)',
  glassBorder: 'rgba(255,255,255,0.9)',
  dialogBg: 'rgba(255,249,249,0.96)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

/* ── Keyframes injected once ── */
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .profile-card { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .info-card-0  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
  .info-card-1  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
  .info-card-2  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
  .stat-card-0  { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
  .stat-card-1  { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.36s both; }
  .stat-card-2  { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.44s both; }
  .lib-section  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
`;
document.head.appendChild(styleEl);

type UserProfile = {
  pseudo: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  banner_url?: string;
  description_courte?: string;
  created_at?: string;
};

type UserGame = {
  id: number;
  status: string;
  is_favorite: boolean;
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
const ALLOWED_AVATAR_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

const fileInputOverlaySx: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  margin: 0,
  padding: 0,
  opacity: 0,
  cursor: 'pointer',
  zIndex: 10,
  fontSize: 0,
};

const glassCard = {
  background: C.cardBg,
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: `1px solid ${C.glassBorder}`,
  borderRadius: '20px',
  boxShadow: '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
};

const fieldSx = {
  fontFamily: FONT_BODY,
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: 'rgba(255,255,255,0.85)',
    fontFamily: FONT_BODY,
    fontSize: 14.5,
    '& fieldset': { borderColor: C.softBorder },
    '&:hover fieldset': { borderColor: C.border },
    '&.Mui-focused fieldset': { borderColor: `${C.accent}88` },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT_BODY },
  '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
};

function formatProfileDate(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';
}

function validateAvatarFile(file: File): string {
  if (file.size > MAX_AVATAR_SIZE) return 'Fichier trop volumineux. Max 2 MB.';

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type;
  const mimeOk = ALLOWED_AVATAR_TYPES.includes(mime);
  const extOk = ALLOWED_AVATAR_EXT.has(ext);
  const mimeEmptyOrUnknown = mime === '' || mime === 'application/octet-stream';

  if (mimeOk || (mimeEmptyOrUnknown && extOk)) return '';

  if (
    mime.includes('heic') ||
    mime.includes('heif') ||
    ext === 'heic' ||
    ext === 'heif'
  )
    return 'Format HEIC non pris en charge. Exporte en JPG ou PNG.';

  return 'Format invalide. JPG, PNG ou WEBP uniquement.';
}

function jeuPluralSuffix(count: number): string {
  return count === 1 ? '' : 'x';
}

type ProfilePageModel = {
  user: UserProfile | null;
  loading: boolean;
  editOpen: boolean;
  form: UserProfile;
  avatarError: string;
  avatarBusy: boolean;
  userGames: UserGame[];
  gamesEnCours: GameListItem[];
  gamesTermines: GameListItem[];
  gamesEnvie: GameListItem[];
  gamesFavoris: GameListItem[];
  avatarSrc: string;
  bannerBusy: boolean;
  handleEditOpen: () => void;
  handleEditClose: () => void;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleModalAvatarChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAvatarRemoveNow: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleBannerChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

function useProfilePageModel(): ProfilePageModel {
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
  const [avatarError, setAvatarError] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
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
          banner_url: data.banner_url || '',
          description_courte: data.description_courte || '',
          created_at: data.created_at || '',
        });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
    apiGet('/api/me/games/').then(res =>
      setUserGames(res.results || res || [])
    );
  }, []);

  const avatarSrc = useMemo(
    () => user?.avatar_url || defaultAvatar,
    [user?.avatar_url]
  );

  const handleEditOpen = () => {
    setAvatarError('');
    setForm({
      pseudo: user?.pseudo || '',
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      avatar_url: user?.avatar_url || '',
      banner_url: user?.banner_url || '',
      description_courte: user?.description_courte || '',
      created_at: user?.created_at || '',
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setAvatarError('');
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const profileTextPayload = () => ({
    pseudo: form.pseudo,
    first_name: form.first_name || '',
    last_name: form.last_name || '',
    description_courte: form.description_courte || '',
  });

  const mergeUpdatedUser = (updated: UserProfile) => {
    setUser(updated);
    setForm(prev => ({
      ...prev,
      pseudo: updated.pseudo ?? prev.pseudo,
      email: updated.email ?? prev.email,
      first_name: updated.first_name ?? prev.first_name,
      last_name: updated.last_name ?? prev.last_name,
      avatar_url: updated.avatar_url ?? prev.avatar_url,
      banner_url: updated.banner_url ?? prev.banner_url,
      description_courte: updated.description_courte ?? prev.description_courte,
      created_at: updated.created_at ?? prev.created_at,
    }));
  };

  const handleModalAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || avatarBusy) return;

    const err = validateAvatarFile(f);
    if (err) {
      setAvatarError(err);
      return;
    }
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const body = new FormData();
      const p = profileTextPayload();
      body.append('pseudo', p.pseudo);
      body.append('first_name', p.first_name);
      body.append('last_name', p.last_name);
      body.append('description_courte', p.description_courte);
      body.append('avatar', f);
      const updated = await apiPatch('/api/me/', body);
      mergeUpdatedUser(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour la photo.';
      setAvatarError(msg);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemoveNow = async () => {
    if (avatarBusy || !user?.avatar_url) return;
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const updated = await apiPatch('/api/me/', {
        ...profileTextPayload(),
        avatar: null,
      });
      mergeUpdatedUser(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible de supprimer la photo.';
      setAvatarError(msg);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleBannerChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || bannerBusy) return;

    const err = validateAvatarFile(f);
    if (err) {
      alert(err);
      return;
    }
    setBannerBusy(true);
    try {
      const body = new FormData();
      body.append('banner', f);
      const updated = await apiPatch('/api/me/', body);
      mergeUpdatedUser(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour la bannière.';
      alert(msg);
    } finally {
      setBannerBusy(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await apiPatch('/api/me/', {
        pseudo: form.pseudo,
        first_name: form.first_name,
        last_name: form.last_name,
        description_courte: form.description_courte,
      });
      mergeUpdatedUser(updated);
      setEditOpen(false);
      setAvatarError('');
    } catch (err: any) {
      alert('Erreur : ' + (err?.message || ''));
    }
  };

  const gamesForStatus = (status: string): GameListItem[] =>
    userGames
      .filter(g => g.status === status)
      .map(g => ({
        id: g.game.id,
        name: g.game.name,
        cover_url: g.game.cover_url,
        image: g.game.image,
        status: g.status,
      }));

  const gamesEnCours = gamesForStatus('EN_COURS');
  const gamesTermines = gamesForStatus('TERMINE');
  const gamesEnvie = gamesForStatus('ENVIE_DE_JOUER');
  const gamesFavoris = userGames
    .filter(g => g.is_favorite)
    .map(g => ({
      id: g.game.id,
      name: g.game.name,
      cover_url: g.game.cover_url,
      image: g.game.image,
      status: g.status,
    }));

  return {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    avatarSrc,
    bannerBusy,
    handleEditOpen,
    handleEditClose,
    handleChange,
    handleModalAvatarChange,
    handleAvatarRemoveNow,
    handleSave,
    handleBannerChange,
  };
}

type ProfileEditDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
  form: UserProfile;
  avatarSrc: string;
  avatarBusy: boolean;
  avatarError: string;
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onAvatarRemove: () => void | Promise<void>;
  onFieldChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void | Promise<void>;
}>;

function ProfileEditDialog({
  open,
  onClose,
  user,
  form,
  avatarSrc,
  avatarBusy,
  avatarError,
  onAvatarChange,
  onAvatarRemove,
  onFieldChange,
  onSave,
}: ProfileEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
          background: C.dialogBg,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${C.glassBorder}`,
          fontFamily: FONT_BODY,
        },
      }}
      BackdropProps={{
        sx: {
          backdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(255,200,200,0.25)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          color: C.title,
          pb: 0.5,
          letterSpacing: -0.4,
          fontSize: 22,
          pt: 3,
          px: 3.5,
        }}
      >
        Modifier mon profil
      </DialogTitle>

      <DialogContent sx={{ px: 3.5, pt: '16px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              py: 1.5,
            }}
          >
            <Box sx={{ position: 'relative', width: 90, height: 90 }}>
              {user?.avatar_url ? (
                <Box
                  component="button"
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => void onAvatarRemove()}
                  aria-label="Supprimer la photo de profil"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: '#d32f2f',
                    border: '2px solid white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: avatarBusy ? 'default' : 'pointer',
                    zIndex: 16,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    p: 0,
                    '&:hover': {
                      bgcolor: avatarBusy ? '#d32f2f' : '#b71c1c',
                      transform: avatarBusy ? 'none' : 'scale(1.15)',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color: '#fff',
                      fontSize: 14,
                      lineHeight: 1,
                      fontWeight: 700,
                    }}
                  >
                    ×
                  </Typography>
                </Box>
              ) : null}

              <Box
                component="label"
                sx={{
                  position: 'relative',
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  cursor: avatarBusy ? 'wait' : 'pointer',
                  opacity: avatarBusy ? 0.75 : 1,
                  '&:hover .modal-av-overlay': {
                    opacity: avatarBusy ? 0 : 1,
                  },
                }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  disabled={avatarBusy}
                  onChange={e => void onAvatarChange(e)}
                  style={{
                    ...fileInputOverlaySx,
                    zIndex: 12,
                    pointerEvents: avatarBusy ? 'none' : 'auto',
                  }}
                />
                <Avatar
                  src={avatarSrc}
                  sx={{
                    width: '100%',
                    height: '100%',
                    fontSize: 32,
                    fontFamily: FONT_DISPLAY,
                    boxShadow: `0 4px 20px ${C.accentGlow}`,
                    bgcolor: C.accent,
                    border: '2.5px solid white',
                    pointerEvents: 'none',
                  }}
                >
                  {form.pseudo?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box
                  className="modal-av-overlay"
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
                    fontWeight: 700,
                    fontFamily: FONT_BODY,
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    pointerEvents: 'none',
                  }}
                >
                  Changer
                </Box>
              </Box>

              {avatarBusy ? (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.55)',
                    zIndex: 20,
                  }}
                >
                  <CircularProgress size={34} sx={{ color: C.accent }} />
                </Box>
              ) : null}
            </Box>

            {avatarError ? (
              <Typography
                sx={{
                  color: C.accent,
                  fontSize: 12.5,
                  fontFamily: FONT_BODY,
                  textAlign: 'center',
                  maxWidth: 320,
                  lineHeight: 1.45,
                  px: 1,
                }}
              >
                {avatarError}
              </Typography>
            ) : null}

            <Typography
              sx={{
                color: C.muted,
                fontSize: 12,
                fontFamily: FONT_BODY,
                textAlign: 'center',
              }}
            >
              Clique sur la photo pour changer · JPG, PNG, WEBP · Max 2 MB
            </Typography>
          </Box>

          <TextField
            label="Pseudo"
            name="pseudo"
            fullWidth
            value={form.pseudo}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label="Prénom"
            name="first_name"
            fullWidth
            value={form.first_name}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label="Nom"
            name="last_name"
            fullWidth
            value={form.last_name}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label="Description"
            name="description_courte"
            fullWidth
            multiline
            minRows={3}
            value={form.description_courte}
            onChange={onFieldChange}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3.5, pb: 3, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 999,
            color: C.muted,
            px: 2.5,
            py: 0.9,
            fontWeight: 500,
            fontSize: 14,
            textTransform: 'none',
            fontFamily: FONT_BODY,
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={() => void onSave()}
          variant="contained"
          sx={{
            borderRadius: 999,
            px: 3.5,
            py: 1,
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'none',
            fontFamily: FONT_BODY,
            background: `linear-gradient(135deg, ${C.accent} 0%, #e53935 100%)`,
            boxShadow: `0 4px 18px ${C.accentGlow}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
              boxShadow: `0 6px 24px rgba(211,47,47,0.28)`,
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.18s ease',
          }}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProfilePage() {
  const {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    avatarSrc,
    bannerBusy,
    handleEditOpen,
    handleEditClose,
    handleChange,
    handleModalAvatarChange,
    handleAvatarRemoveNow,
    handleSave,
    handleBannerChange,
  } = useProfilePageModel();

  const bannerInputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FONT_BODY,
        /* Noise grain texture + rose base */
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 120% 80% at 15% -10%, rgba(255,200,200,0.6) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 90% 110%, rgba(211,47,47,0.07) 0%, transparent 50%),
          ${C.pageBg}
        `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
        {/* ── Top bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: { xs: 22, md: 26 },
              color: C.title,
              letterSpacing: -0.8,
              background: `linear-gradient(135deg, ${C.title} 40%, ${C.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ludokan
          </Typography>
        </Box>

        {/* ── HERO SECTION ── */}
        <Box sx={{ position: 'relative', mb: { xs: 8, md: 7 } }}>
          {/* Banner */}
          <Box
            component="img"
            src={user?.banner_url || zeldaBanner}
            alt="Banner"
            sx={{
              width: '100%',
              height: { xs: 220, sm: 280, md: 380 },
              objectFit: 'cover',
              borderRadius: '28px',
              display: 'block',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          />
          {user && (
            <>
              <Box
                component="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerBusy}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: bannerBusy ? 'wait' : 'pointer',
                  zIndex: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.7)',
                  },
                }}
              >
                {bannerBusy ? (
                  <CircularProgress size={20} sx={{ color: '#fff' }} />
                ) : (
                  <CameraAltIcon fontSize="small" />
                )}
              </Box>
              <input
                type="file"
                ref={bannerInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/webp"
                onChange={handleBannerChange}
              />
            </>
          )}

          {/* Gradient scrim */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              background:
                'linear-gradient(160deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.55) 100%)',
            }}
          />

          {/* Floating profile identity card */}
          <Box
            className="profile-card"
            sx={{
              position: 'absolute',
              left: { xs: 16, md: 28 },
              right: { xs: 16, md: 28 },
              bottom: { xs: -100, md: -88 },
              ...glassCard,
              '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
              px: { xs: 2.5, md: 4 },
              py: { xs: 2.5, md: 3 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 2, md: 3 },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 2, md: 3 },
                }}
              >
                {/* Avatar (lecture seule — changement uniquement via « Modifier le profil ») */}
                <Box
                  sx={{
                    position: 'relative',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      background: `conic-gradient(from 180deg, ${C.accent}, #ff8a80, ${C.accent})`,
                      opacity: 0.35,
                      animation: 'shimmer 2s linear infinite',
                      backgroundSize: '200% auto',
                      pointerEvents: 'none',
                    }}
                  />
                  <Avatar
                    src={avatarSrc}
                    alt={user?.pseudo}
                    sx={{
                      width: { xs: 80, md: 96 },
                      height: { xs: 80, md: 96 },
                      border: '3px solid white',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                      fontSize: 34,
                      bgcolor: C.accent,
                      fontFamily: FONT_DISPLAY,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {user?.pseudo?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                </Box>

                {/* Identity */}
                <Box>
                  <Typography
                    sx={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 900,
                      fontSize: { xs: 24, md: 32 },
                      color: C.title,
                      lineHeight: 1.05,
                      letterSpacing: -0.6,
                    }}
                  >
                    {loading ? '...' : user?.pseudo || 'Utilisateur'}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.5,
                      color: C.muted,
                      fontSize: 13.5,
                      fontFamily: FONT_BODY,
                      fontWeight: 400,
                    }}
                  >
                    {loading ? '...' : user?.email}
                  </Typography>
                  {user?.description_courte && (
                    <Typography
                      sx={{
                        mt: 1,
                        color: C.text,
                        fontSize: 14,
                        lineHeight: 1.6,
                        maxWidth: 480,
                        fontFamily: FONT_BODY,
                        opacity: 0.8,
                      }}
                    >
                      {user.description_courte}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Edit button */}
              <Box
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: 'flex-start', md: 'center' },
                }}
              >
                <SecondaryButton onClick={handleEditOpen}>
                  Modifier le profil
                </SecondaryButton>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* spacer for floating card */}
        <Box sx={{ height: { xs: 56, md: 44 } }} />

        {/* ── INFO CARDS ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' },
            gap: 2,
            mb: 2.5,
          }}
        >
          {/* Présentation */}
          <Paper
            elevation={0}
            className="info-card-0"
            sx={{ ...glassCard, p: '26px 28px' }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: C.accent,
                mb: 1.5,
                fontFamily: FONT_BODY,
              }}
            >
              À propos
            </Typography>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                color: C.title,
                mb: 1.25,
                letterSpacing: -0.3,
                lineHeight: 1.15,
              }}
            >
              Profil joueur
            </Typography>
            <Typography
              sx={{
                color: C.muted,
                lineHeight: 1.75,
                fontSize: 14,
                fontFamily: FONT_BODY,
              }}
            >
              {loading
                ? '...'
                : user?.description_courte ||
                  'Ajoute une description pour personnaliser ton profil.'}
            </Typography>
          </Paper>

          {/* Identité */}
          <Paper
            elevation={0}
            className="info-card-1"
            sx={{ ...glassCard, p: '26px 28px' }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                color: C.accent,
                mb: 1.5,
                fontFamily: FONT_BODY,
              }}
            >
              Identité
            </Typography>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                color: C.title,
                mb: 1.5,
                letterSpacing: -0.3,
                lineHeight: 1.15,
              }}
            >
              {loading
                ? '...'
                : `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
                  'N/A'}
            </Typography>
            {[
              { k: 'Pseudo', v: user?.pseudo },
              { k: 'Email', v: user?.email },
            ].map(({ k, v }) => (
              <Box
                key={k}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 1.5,
                  mb: 0.9,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: C.light,
                    minWidth: 50,
                    flexShrink: 0,
                  }}
                >
                  {k}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 13.5,
                    color: C.text,
                    wordBreak: 'break-all',
                  }}
                >
                  {loading ? '...' : v || 'N/A'}
                </Typography>
              </Box>
            ))}
          </Paper>

          {/* Compte */}
          <Paper
            elevation={0}
            className="info-card-2"
            sx={{
              ...glassCard,
              p: '26px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: C.accent,
                  mb: 1.5,
                  fontFamily: FONT_BODY,
                }}
              >
                Compte
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 20,
                  color: C.title,
                  mb: 1.5,
                  letterSpacing: -0.3,
                  lineHeight: 1.15,
                }}
              >
                Membre depuis
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontSize: 18,
                fontWeight: 700,
                color: C.title,
                lineHeight: 1.3,
              }}
            >
              {loading ? '...' : formatProfileDate(user?.created_at)}
            </Typography>
          </Paper>
        </Box>

        {/* ── STATS ── */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: C.title,
                letterSpacing: -0.3,
              }}
            >
              Informations
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, ${C.border}, transparent)`,
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
              { label: 'Prénom', value: user?.first_name, cls: 'stat-card-0' },
              { label: 'Nom', value: user?.last_name, cls: 'stat-card-1' },
              {
                label: 'Inscrit le',
                value: user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('fr-FR')
                  : null,
                cls: 'stat-card-2',
              },
            ].map(({ label, value, cls }) => (
              <Paper
                key={label}
                elevation={0}
                className={cls}
                sx={{
                  ...glassCard,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 4,
                  gap: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '40%',
                    height: '2px',
                    background: `linear-gradient(to right, transparent, ${C.accent}55, transparent)`,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    color: C.light,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    color: C.title,
                    fontSize: label === 'Inscrit le' ? 22 : 28,
                    fontWeight: 900,
                    letterSpacing: -0.4,
                  }}
                >
                  {loading ? '...' : value || 'N/A'}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* ── COUPS DE CŒUR ── */}
        {gamesFavoris.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              ...glassCard,
              '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
              p: { xs: 2.5, md: 4 },
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: C.accent,
                    mb: 0.5,
                  }}
                >
                  Sélection
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 20,
                    color: C.title,
                    letterSpacing: -0.3,
                  }}
                >
                  Coups de cœur ({gamesFavoris.length})
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 999,
                  background: 'rgba(211,47,47,0.1)',
                  border: '1px solid rgba(211,47,47,0.25)',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    color: C.accent,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {gamesFavoris.length} jeu
                  {jeuPluralSuffix(gamesFavoris.length)}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                height: '1px',
                background: `linear-gradient(to right, ${C.accent}33, ${C.border}, transparent)`,
                mb: 3,
              }}
            />

            <GameList games={gamesFavoris} showStatus={false} />
          </Paper>
        )}

        {/* ── LIBRARY ── */}
        <Paper
          elevation={0}
          className="lib-section"
          sx={{
            ...glassCard,
            '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
            p: { xs: 2.5, md: 4 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: C.accent,
                  mb: 0.5,
                }}
              >
                Bibliothèque
              </Typography>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 20,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                Jeux par statut
              </Typography>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 999,
                background: 'rgba(211,47,47,0.1)',
                border: '1px solid rgba(211,47,47,0.25)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  color: C.accent,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {userGames.length} jeu{jeuPluralSuffix(userGames.length)} au
                total
              </Typography>
            </Box>
          </Box>

          {/* Thin accent line */}
          <Box
            sx={{
              height: '1px',
              background: `linear-gradient(to right, ${C.accent}33, ${C.border}, transparent)`,
              mb: 3,
            }}
          />

          {/* ── Game lists stacked vertically ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { games: gamesEnCours, label: 'En cours' },
              { games: gamesTermines, label: 'Terminés' },
              { games: gamesEnvie, label: "Envie d'y jouer" },
            ].map(({ games, label }) => (
              <GameList
                key={label}
                games={games}
                title={`${label} (${games.length})`}
                showStatus={false}
              />
            ))}
          </Box>
        </Paper>
      </Box>

      <ProfileEditDialog
        open={editOpen}
        onClose={handleEditClose}
        user={user}
        form={form}
        avatarSrc={avatarSrc}
        avatarBusy={avatarBusy}
        avatarError={avatarError}
        onAvatarChange={handleModalAvatarChange}
        onAvatarRemove={handleAvatarRemoveNow}
        onFieldChange={handleChange}
        onSave={handleSave}
      />
    </Box>
  );
}
