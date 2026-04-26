import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  TextField,
  Typography,
  Menu,
  MenuItem,
  DialogContentText,
  Tooltip,
} from '@mui/material';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { GameListItem } from '../components/GameList';
import {
  CreateCollectionModal,
  ManageCollectionsModal,
} from '../components/UserCollectionModals';
import {
  LIBRARY_COLLECTION_QUERY_KEY,
  LIBRARY_STATUS_QUERY_KEY,
  type LibraryCollectionFilter,
  type LibraryStatusFilter,
  parseLibraryCollectionParam,
  parseLibraryStatusParam,
} from '../constants/libraryFilter';
import SecondaryButton from '../components/SecondaryButton';
import {
  fetchMyCollections,
  removeGameFromCollection,
  type UserCollection,
} from '../api/collections';
import { deleteUserGame } from '../api/userGames';
import { apiGet, apiPatch, apiPost, apiDelete } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import zeldaBanner from '../assets/default/zelda-banner.png';
import ProfilePageLibrarySection from './ProfilePageLibrarySection';

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
  id: number;
  pseudo: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  banner_url?: string;
  description_courte?: string;
  created_at?: string;
  steam_id?: string | null;
  review_count?: number;
  total_playtime?: number;
  games_finished_percentage?: number;
  games_played_percentage?: number;
  total_games_count?: number;
};

type UserGame = {
  id: number;
  collection_ids?: number[];
  status: string;
  is_favorite: boolean;
  date_added: string;
  playtime_forever?: number | null;
  game: {
    id: number;
    name: string;
    cover_url?: string;
    image?: string;
    publisher?: { name: string };
    steam_appid?: number | null;
  };
};

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
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
  const mimeOk = ALLOWED_AVATAR_TYPES.has(mime);
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

type ProfileStatCardProps = {
  label: string;
  value: string | null | undefined;
  cls: string;
  loading?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  smallValue?: boolean;
};

const ProfileStatCard = ({
  label,
  value,
  cls,
  loading,
  onClick,
  clickable,
  smallValue,
}: ProfileStatCardProps) => {
  return (
    <Paper
      elevation={0}
      className={cls}
      onClick={onClick}
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
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': clickable
          ? {
              transform: 'translateY(-5px)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            }
          : glassCard['&:hover'],
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
          fontSize: smallValue ? 22 : 28,
          fontWeight: 900,
          letterSpacing: -0.4,
        }}
      >
        {loading ? '...' : value || 'N/A'}
      </Typography>
    </Paper>
  );
};

type ProfilePageModel = {
  user: UserProfile | null;
  loading: boolean;
  editOpen: boolean;
  form: UserProfile;
  avatarError: string;
  avatarBusy: boolean;
  userGames: UserGame[];
  userGamesForLibrary: UserGame[];
  gamesEnCours: GameListItem[];
  gamesTermines: GameListItem[];
  gamesEnvie: GameListItem[];
  gamesFavoris: GameListItem[];
  avatarSrc: string;
  removeGame: (userGameId: number) => void;
  snackbar: { open: boolean; message: string; isError: boolean };
  handleSnackbarClose: () => void;
  handleUndo: () => void;
  bannerBusy: boolean;
  handleEditOpen: () => void;
  handleEditClose: () => void;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleModalAvatarChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAvatarRemoveNow: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleBannerChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleBannerRemoveNow: () => Promise<void>;
  steamBusy: boolean;
  handleSteamConnect: () => Promise<void>;
  handleSteamDisconnect: () => Promise<void>;
  handleSteamSync: () => Promise<void>;
  reloadUserGames: () => Promise<void>;
};

function useProfilePageModel(
  collectionFilterId: LibraryCollectionFilter
): ProfilePageModel {
  const { t } = useTranslation();
  const { user: globalUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    id: 0,
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
  const [steamBusy, setSteamBusy] = useState(false);
  const [userGames, setUserGames] = useState<UserGame[]>([]);

  // Sync with global user if it updates (e.g. email from ForcedEmailModal)
  useEffect(() => {
    if (globalUser && user && globalUser.id === user.id) {
      if (
        globalUser.email !== user.email ||
        globalUser.pseudo !== user.pseudo
      ) {
        setUser(prev =>
          prev
            ? {
                ...prev,
                email: globalUser.email || prev.email,
                pseudo: globalUser.pseudo || prev.pseudo,
              }
            : null
        );
        setForm(prev => ({
          ...prev,
          email: globalUser.email || prev.email,
          pseudo: globalUser.pseudo || prev.pseudo,
        }));
      }
    }
  }, [globalUser, user]);

  const handleSteamConnect = async () => {
    if (steamBusy) return;
    setSteamBusy(true);
    try {
      const res = await apiGet('/api/auth/steam/login/');
      if (res.auth_url) {
        window.open(res.auth_url, '_blank', 'noopener,noreferrer');
        setSteamBusy(false);
      }
    } catch (err: any) {
      alert(
        'Erreur: ' + (err?.message || 'Impossible de se connecter à Steam')
      );
      setSteamBusy(false);
    }
  };

  const handleSteamDisconnect = async () => {
    if (steamBusy) return;
    setSteamBusy(true);
    try {
      await apiDelete('/api/auth/steam/disconnect/');
      setUser(prev => (prev ? { ...prev, steam_id: null } : null));
    } catch (err: any) {
      alert(
        'Erreur: ' +
          (err?.message || 'Impossible de déconnecter le compte Steam')
      );
    } finally {
      setSteamBusy(false);
    }
  };

  const reloadUserGames = useCallback(async () => {
    try {
      const res = await apiGet('/api/me/games/');
      setUserGames(res.results || res || []);
    } catch {
      // ignore
    }
  }, []);

  const handleSteamSync = async () => {
    if (steamBusy) return;
    setSteamBusy(true);
    try {
      await apiPost('/api/sync/steam/', {});
      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          await reloadUserGames();
        } catch {
          /* ignore */
        }
        if (polls >= 10) {
          clearInterval(pollInterval);
          setSteamBusy(false);
        }
      }, 3000);
    } catch {
      setSteamBusy(false);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(globalThis.location.search);
    if (searchParams.get('syncing') === 'true') {
      let polls = 0;
      setSteamBusy(true);
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          const [gamesRes, meRes] = await Promise.all([
            apiGet('/api/me/games/'),
            apiGet('/api/me/'),
          ]);
          setUserGames(gamesRes.results || gamesRes || []);
          setUser(meRes);
        } catch {
          /* ignore */
        }
        if (polls >= 10) {
          clearInterval(pollInterval);
          setSteamBusy(false);
        }
      }, 3000);
    }
    if (searchParams.get('new_user') || searchParams.get('syncing')) {
      globalThis.history.replaceState(
        {},
        document.title,
        globalThis.location.pathname
      );
    }

    apiGet('/api/me/')
      .then(data => {
        setUser(data);
        setForm({
          id: data.id,
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
      id: user?.id || 0,
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
      setAvatarError(
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour la photo.'
      );
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
      setAvatarError(
        err instanceof Error ? err.message : 'Impossible de supprimer la photo.'
      );
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
      alert(
        err instanceof Error
          ? err.message
          : 'Impossible de mettre à jour la bannière.'
      );
    } finally {
      setBannerBusy(false);
    }
  };

  const handleBannerRemoveNow = async () => {
    if (bannerBusy || !user?.banner_url) return;
    setBannerBusy(true);
    try {
      const updated = await apiPatch('/api/me/', {
        ...profileTextPayload(),
        banner: null,
      });
      mergeUpdatedUser(updated);
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : 'Impossible de supprimer la bannière.'
      );
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

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    isError: boolean;
  }>({
    open: false,
    message: '',
    isError: false,
  });
  const undoRef = useRef<{ game: UserGame; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSnackbarClose = () => setSnackbar(s => ({ ...s, open: false }));

  const handleUndo = () => {
    if (!undoRef.current) return;
    const { game, index } = undoRef.current;
    setUserGames(prev => {
      const next = [...prev];
      next.splice(index, 0, game);
      return next;
    });
    undoRef.current = null;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setSnackbar({ open: false, message: '', isError: false });
  };

  const removeGame = (userGameId: number) => {
    const index = userGames.findIndex(g => g.id === userGameId);
    const ug = userGames[index];
    if (!ug) return;
    setUserGames(prev => prev.filter(g => g.id !== userGameId));
    undoRef.current = { game: ug, index };
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setSnackbar({
      open: true,
      message: t('profilePage.gameRemoved'),
      isError: false,
    });
    undoTimerRef.current = setTimeout(async () => {
      undoRef.current = null;
      try {
        await deleteUserGame(ug.game.id);
      } catch {
        setUserGames(prev => {
          const next = [...prev];
          next.splice(index, 0, ug);
          return next;
        });
        setSnackbar({
          open: true,
          message: t('profilePage.gameRemoveError'),
          isError: true,
        });
      }
    }, 5000);
  };

  const userGamesForLibrary = useMemo(() => {
    if (collectionFilterId === 'ALL') return userGames;
    return userGames.filter(ug =>
      Array.isArray(ug.collection_ids)
        ? ug.collection_ids.includes(collectionFilterId)
        : false
    );
  }, [userGames, collectionFilterId]);

  const gamesForStatus = useCallback(
    (games: UserGame[], status: string): GameListItem[] =>
      games
        .filter(g => g.status === status)
        .map(g => ({
          id: g.game.id,
          name: g.game.name,
          cover_url: g.game.cover_url,
          image: g.game.image,
          status: g.status,
          userGameId: g.id,
          steam_appid: g.game.steam_appid,
          playtime_forever: g.playtime_forever,
        })),
    []
  );

  const gamesEnCours = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'EN_COURS'),
    [userGamesForLibrary, gamesForStatus]
  );
  const gamesTermines = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'TERMINE'),
    [userGamesForLibrary, gamesForStatus]
  );
  const gamesEnvie = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'ENVIE_DE_JOUER'),
    [userGamesForLibrary, gamesForStatus]
  );
  const gamesFavoris = useMemo(
    () =>
      userGamesForLibrary
        .filter(g => g.is_favorite)
        .map(g => ({
          id: g.game.id,
          name: g.game.name,
          cover_url: g.game.cover_url,
          image: g.game.image,
          status: g.status,
          userGameId: g.id,
          steam_appid: g.game.steam_appid,
          playtime_forever: g.playtime_forever,
        })),
    [userGamesForLibrary]
  );

  return {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
    userGamesForLibrary,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    avatarSrc,
    removeGame,
    snackbar,
    handleSnackbarClose,
    handleUndo,
    bannerBusy,
    handleEditOpen,
    handleEditClose,
    handleChange,
    handleModalAvatarChange,
    handleAvatarRemoveNow,
    handleSave,
    handleBannerChange,
    handleBannerRemoveNow,
    steamBusy,
    handleSteamConnect,
    handleSteamDisconnect,
    handleSteamSync,
    reloadUserGames,
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
  const { t } = useTranslation();

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
        {t('profilePage.editTitle')}
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
              {user?.avatar_url && (
                <Box
                  component="button"
                  type="button"
                  disabled={avatarBusy}
                  onClick={() => void onAvatarRemove()}
                  aria-label={t('profilePage.avatarRemoveAriaLabel')}
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
              )}
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
                  '&:hover .modal-av-overlay': { opacity: avatarBusy ? 0 : 1 },
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
                  {t('profilePage.avatarChangeOverlay')}
                </Box>
              </Box>
              {avatarBusy && (
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
              )}
            </Box>
            {avatarError && (
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
            )}
            <Typography
              sx={{
                color: C.muted,
                fontSize: 12,
                fontFamily: FONT_BODY,
                textAlign: 'center',
              }}
            >
              {t('profilePage.avatarHint')}
            </Typography>
          </Box>

          <TextField
            label={t('profilePage.pseudo')}
            name="pseudo"
            fullWidth
            value={form.pseudo}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label={t('profilePage.firstName')}
            name="first_name"
            fullWidth
            value={form.first_name}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label={t('profilePage.lastName')}
            name="last_name"
            fullWidth
            value={form.last_name}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label="E-mail"
            name="email"
            fullWidth
            value={form.email}
            onChange={onFieldChange}
            sx={fieldSx}
          />
          <TextField
            label={t('profilePage.description')}
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
          {t('profilePage.cancel')}
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
          {t('profilePage.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type ProfileIntegrationsProps = Readonly<{
  steam_id?: string | null;
  steamBusy: boolean;
  onSteamConnect: () => void;
  onSteamDisconnect: () => void;
  onSteamSync: () => void;
}>;

function ProfileIntegrations({
  steam_id,
  steamBusy,
  onSteamConnect,
  onSteamDisconnect,
  onSteamSync,
}: ProfileIntegrationsProps) {
  const { t } = useTranslation();

  return (
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
          {t('profilePage.integrationsLabel')}
        </Typography>
        <Box
          sx={{
            flex: 1,
            height: '1px',
            background: `linear-gradient(to right, ${C.border}, transparent)`,
          }}
        />
      </Box>
      <Paper
        elevation={0}
        sx={{
          ...glassCard,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          p: '22px 28px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: '#171a21',
              color: '#fff',
              width: 48,
              height: 48,
              fontWeight: 700,
              fontFamily: FONT_DISPLAY,
            }}
          >
            S
          </Avatar>
          <Box>
            <Typography
              sx={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 16 }}
            >
              {t('profilePage.steamLabel')}
            </Typography>
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {t('profilePage.steamDesc')}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
            gap: 1.5,
          }}
        >
          {steam_id ? (
            <>
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  color: '#43a047',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {t('profilePage.steamConnected')}
              </Typography>
              <Tooltip
                title={
                  steamBusy
                    ? t('profilePage.steamSyncTooltip')
                    : t('profilePage.steamSyncTooltipDefault')
                }
                arrow
              >
                <span>
                  <Button
                    onClick={onSteamSync}
                    disabled={steamBusy}
                    variant="outlined"
                    color="info"
                    sx={{
                      borderRadius: 999,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontFamily: FONT_BODY,
                      minWidth: 130,
                    }}
                  >
                    {steamBusy ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      t('profilePage.steamSync')
                    )}
                  </Button>
                </span>
              </Tooltip>
              <Button
                onClick={onSteamDisconnect}
                disabled={steamBusy}
                variant="outlined"
                color="error"
                sx={{
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontFamily: FONT_BODY,
                  minWidth: 130,
                }}
              >
                {steamBusy ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  t('profilePage.steamDisconnect')
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={onSteamConnect}
              disabled={steamBusy}
              variant="contained"
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 600,
                fontFamily: FONT_BODY,
                bgcolor: '#171a21',
                color: '#fff',
                '&:hover': { bgcolor: '#2a475e' },
                minWidth: 130,
              }}
            >
              {steamBusy ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                t('profilePage.steamConnect')
              )}
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const collectionFilterId = useMemo(
    () =>
      parseLibraryCollectionParam(
        searchParams.get(LIBRARY_COLLECTION_QUERY_KEY)
      ),
    [searchParams]
  );

  const {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
    userGamesForLibrary,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    avatarSrc,
    removeGame,
    snackbar,
    handleSnackbarClose,
    handleUndo,
    bannerBusy,
    handleEditOpen,
    handleEditClose,
    handleChange,
    handleModalAvatarChange,
    handleAvatarRemoveNow,
    handleSave,
    handleBannerChange,
    handleBannerRemoveNow,
    steamBusy,
    handleSteamConnect,
    handleSteamDisconnect,
    handleSteamSync,
    reloadUserGames,
  } = useProfilePageModel(collectionFilterId);

  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [librarySectionMenuAnchor, setLibrarySectionMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] =
    useState(false);
  const [manageCollectionsModalOpen, setManageCollectionsModalOpen] =
    useState(false);

  const refreshCollections = useCallback(async () => {
    try {
      const list = await fetchMyCollections();
      setCollections(list);
    } catch {
      setCollections([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setCollectionsLoading(true);
    refreshCollections().finally(() => {
      if (alive) setCollectionsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [refreshCollections, user?.pseudo]);

  useEffect(() => {
    refreshCollections();
  }, [userGames.length, refreshCollections]);

  const libraryFilter = useMemo(
    () => parseLibraryStatusParam(searchParams.get(LIBRARY_STATUS_QUERY_KEY)),
    [searchParams]
  );

  const setLibraryFilter = useCallback(
    (next: LibraryStatusFilter) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next === 'ALL') p.delete(LIBRARY_STATUS_QUERY_KEY);
          else p.set(LIBRARY_STATUS_QUERY_KEY, next);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setLibraryCollectionFilter = useCallback(
    (next: LibraryCollectionFilter) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next === 'ALL') p.delete(LIBRARY_COLLECTION_QUERY_KEY);
          else p.set(LIBRARY_COLLECTION_QUERY_KEY, String(next));
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const libraryCounts = useMemo(
    () => ({
      all: userGamesForLibrary.length,
      enCours: gamesEnCours.length,
      termines: gamesTermines.length,
      envie: gamesEnvie.length,
    }),
    [
      userGamesForLibrary.length,
      gamesEnCours.length,
      gamesTermines.length,
      gamesEnvie.length,
    ]
  );

  const gamesForLibraryFilter = useMemo((): GameListItem[] => {
    switch (libraryFilter) {
      case 'EN_COURS':
        return gamesEnCours;
      case 'TERMINE':
        return gamesTermines;
      case 'ENVIE_DE_JOUER':
        return gamesEnvie;
      default:
        return [];
    }
  }, [libraryFilter, gamesEnCours, gamesTermines, gamesEnvie]);

  const singleFilterTitle = useMemo(() => {
    const map: Record<Exclude<LibraryStatusFilter, 'ALL'>, string> = {
      EN_COURS: t('profilePage.statusPlaying'),
      TERMINE: t('profilePage.statusDone'),
      ENVIE_DE_JOUER: t('profilePage.statusWishlist'),
    };
    if (libraryFilter === 'ALL') return '';
    return map[libraryFilter];
  }, [libraryFilter, t]);

  const activeCollectionMeta = useMemo(
    () =>
      typeof collectionFilterId === 'number'
        ? collections.find(c => c.id === collectionFilterId)
        : undefined,
    [collections, collectionFilterId]
  );

  const gameListCollectionProps = useMemo(() => {
    const canDetach =
      typeof collectionFilterId === 'number' &&
      activeCollectionMeta?.system_key !== 'MA_LUDOTHEQUE';
    if (!canDetach) return {};
    const colId = collectionFilterId;
    return {
      onDetachFromCollection: async (userGameId: number) => {
        try {
          await removeGameFromCollection(colId, userGameId);
          await reloadUserGames();
          await refreshCollections();
        } catch (err) {
          console.error(err);
        }
      },
      detachFromCollectionTitle: t('collections.profileDetachTooltip', {
        name:
          activeCollectionMeta?.name ?? t('collections.defaultCollectionName'),
      }),
    };
  }, [
    collectionFilterId,
    activeCollectionMeta?.system_key,
    activeCollectionMeta?.name,
    reloadUserGames,
    refreshCollections,
    t,
  ]);

  const libraryBadgeText = useMemo(() => {
    if (collectionFilterId === 'ALL') {
      return userGames.length <= 1
        ? t('profilePage.libraryTotal', { count: userGames.length })
        : t('profilePage.libraryTotalPlural', { count: userGames.length });
    }
    return userGamesForLibrary.length <= 1
      ? t('profilePage.libraryInViewOne', {
          count: userGamesForLibrary.length,
        })
      : t('profilePage.libraryInViewMany', {
          count: userGamesForLibrary.length,
        });
  }, [collectionFilterId, userGames.length, userGamesForLibrary.length, t]);

  const handleCloseManageCollectionsModal = useCallback(() => {
    setManageCollectionsModalOpen(false);
    refreshCollections().catch(() => {});
    reloadUserGames().catch(() => {});
  }, [refreshCollections, reloadUserGames]);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [bannerMenuAnchor, setBannerMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const bannerMenuOpen = Boolean(bannerMenuAnchor);
  const [confirmDeleteBannerOpen, setConfirmDeleteBannerOpen] = useState(false);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FONT_BODY,
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
        {/* HERO */}
        <Box sx={{ position: 'relative', mb: { xs: 8, md: 7 } }}>
          {loading ? (
            <Box
              sx={{
                width: '100%',
                height: { xs: 220, sm: 280, md: 380 },
                borderRadius: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <CircularProgress sx={{ color: C.accent }} />
            </Box>
          ) : (
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
          )}

          {user && (
            <>
              <Box
                component="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                  setBannerMenuAnchor(e.currentTarget)
                }
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
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                }}
              >
                {bannerBusy ? (
                  <CircularProgress size={20} sx={{ color: '#fff' }} />
                ) : (
                  <MoreVertIcon fontSize="small" />
                )}
              </Box>

              <Menu
                anchorEl={bannerMenuAnchor}
                open={bannerMenuOpen}
                onClose={() => setBannerMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    minWidth: 180,
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    setBannerMenuAnchor(null);
                    bannerInputRef.current?.click();
                  }}
                  sx={{ fontFamily: FONT_BODY, fontSize: 14 }}
                >
                  {t('profilePage.addBanner')}
                </MenuItem>
                {user?.banner_url && (
                  <MenuItem
                    sx={{
                      color: 'error.main',
                      fontFamily: FONT_BODY,
                      fontSize: 14,
                    }}
                    onClick={() => {
                      setBannerMenuAnchor(null);
                      setConfirmDeleteBannerOpen(true);
                    }}
                  >
                    {t('profilePage.deleteBanner')}
                  </MenuItem>
                )}
              </Menu>

              <Dialog
                open={confirmDeleteBannerOpen}
                onClose={() => setConfirmDeleteBannerOpen(false)}
                PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
              >
                <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                  {t('profilePage.bannerConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                  <DialogContentText sx={{ fontFamily: FONT_BODY }}>
                    {t('profilePage.bannerConfirmText')}
                  </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button
                    onClick={() => setConfirmDeleteBannerOpen(false)}
                    sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
                  >
                    {t('profilePage.cancel')}
                  </Button>
                  <Button
                    color="error"
                    variant="contained"
                    disableElevation
                    sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
                    onClick={() => {
                      setConfirmDeleteBannerOpen(false);
                      handleBannerRemoveNow();
                    }}
                  >
                    {t('profilePage.deleteBannerConfirm')}
                  </Button>
                </DialogActions>
              </Dialog>

              <input
                type="file"
                ref={bannerInputRef}
                style={{ display: 'none' }}
                accept="image/png, image/jpeg, image/webp"
                onChange={handleBannerChange}
              />
            </>
          )}

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              background:
                'linear-gradient(160deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.55) 100%)',
            }}
          />

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
              <Box
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: 'flex-start', md: 'center' },
                }}
              >
                <SecondaryButton onClick={handleEditOpen}>
                  {t('profilePage.editProfile')}
                </SecondaryButton>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ height: { xs: 56, md: 44 } }} />

        {/* INFO CARDS */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr 1fr' },
            gap: 2,
            mb: 2.5,
          }}
        >
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
              {t('profilePage.about')}
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
              {t('profilePage.aboutTitle')}
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
                : user?.description_courte || t('profilePage.aboutEmpty')}
            </Typography>
          </Paper>

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
              {t('profilePage.identityLabel')}
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
              { k: t('profilePage.pseudoLabel'), v: user?.pseudo },
              { k: t('profilePage.emailLabel'), v: user?.email },
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
                {t('profilePage.accountLabel')}
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
                {t('profilePage.memberSince')}
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

        {/* STATS */}
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
              {t('profilePage.infoLabel')}
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
              {
                label: t('profilePage.playtimeLabel'),
                value: user?.total_playtime ? `${user.total_playtime}h` : '0h',
                cls: 'stat-card-0',
              },
              {
                label: t('profilePage.reviewsLabel'),
                value: user?.review_count?.toString() || '0',
                cls: 'stat-card-1',
                onClick: () => navigate('/profile/reviews'),
                clickable: true,
              },
              {
                label: t('profilePage.registeredLabel'),
                value: user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('fr-FR')
                  : null,
                cls: 'stat-card-2',
              },
            ].map(props => (
              <ProfileStatCard
                key={props.label}
                {...props}
                loading={loading}
                smallValue={props.label === t('profilePage.registeredLabel')}
              />
            ))}
          </Box>
        </Box>

        {/* ── STATS SECTION ── */}
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
              {t('profilePage.statsLabel')}
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
              {
                label: t('profilePage.finishedRatioLabel'),
                value: user?.games_finished_percentage
                  ? `${user.games_finished_percentage}%`
                  : '0%',
                cls: 'stat-card-0',
              },
              {
                label: t('profilePage.playedRatioLabel'),
                value: user?.games_played_percentage
                  ? `${user.games_played_percentage}%`
                  : '0%',
                cls: 'stat-card-1',
              },
              {
                label: t('profilePage.totalGamesLabel'),
                value: user?.total_games_count?.toString() || '0',
                cls: 'stat-card-2',
              },
            ].map(props => (
              <ProfileStatCard key={props.label} {...props} loading={loading} />
            ))}
          </Box>
        </Box>

        <ProfileIntegrations
          steam_id={user?.steam_id}
          steamBusy={steamBusy}
          onSteamConnect={handleSteamConnect}
          onSteamDisconnect={handleSteamDisconnect}
          onSteamSync={handleSteamSync}
        />

        {/* ── LIBRARY ── */}
        <ProfilePageLibrarySection
          glassCard={glassCard}
          paperRestingBoxShadow={glassCard.boxShadow}
          accent={C.accent}
          titleColor={C.title}
          borderColor={C.border}
          libraryBadgeText={libraryBadgeText}
          librarySectionMenuAnchor={librarySectionMenuAnchor}
          setLibrarySectionMenuAnchor={setLibrarySectionMenuAnchor}
          setCreateCollectionModalOpen={setCreateCollectionModalOpen}
          setManageCollectionsModalOpen={setManageCollectionsModalOpen}
          libraryFilter={libraryFilter}
          setLibraryFilter={setLibraryFilter}
          libraryCounts={libraryCounts}
          collections={collections}
          collectionFilterId={collectionFilterId}
          setLibraryCollectionFilter={setLibraryCollectionFilter}
          collectionsLoading={collectionsLoading}
          gamesFavoris={gamesFavoris}
          gamesEnCours={gamesEnCours}
          gamesTermines={gamesTermines}
          gamesEnvie={gamesEnvie}
          gamesForLibraryFilter={gamesForLibraryFilter}
          singleFilterTitle={singleFilterTitle}
          removeGame={removeGame}
          gameListCollectionProps={gameListCollectionProps}
        />
      </Box>

      <CreateCollectionModal
        open={createCollectionModalOpen}
        onClose={() => setCreateCollectionModalOpen(false)}
        onCreated={async () => {
          await refreshCollections();
        }}
      />
      <ManageCollectionsModal
        open={manageCollectionsModalOpen}
        onClose={handleCloseManageCollectionsModal}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.isError ? 'error' : 'success'}
          onClose={handleSnackbarClose}
          action={
            snackbar.isError ? undefined : (
              <Button color="inherit" size="small" onClick={handleUndo}>
                {t('profilePage.undoLabel')}
              </Button>
            )
          }
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

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
