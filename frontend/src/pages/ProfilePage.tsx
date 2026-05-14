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
import { useTheme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LibraryPrivacyModal from '../components/LibraryPrivacyModal';
import {
  CreateCollectionModal,
  ManageCollectionsModal,
} from '../components/UserCollectionModals';
import SecondaryButton from '../components/SecondaryButton';
import { fetchMyCollections, type UserCollection } from '../api/collections';
import { formatPlaytime } from '../utils/timeUtils';
import {
  deleteUserGame,
  fetchUserGames,
  type UserGame as ApiUserGame,
} from '../api/userGames';
import { startMicrosoftConnect } from '../auth/microsoftAuth';
import { apiGet, apiPatch, apiPost, apiDelete } from '../services/api';
import { useAuth } from '../contexts/useAuth';
import zeldaBanner from '../assets/default/zelda-banner.png';
import ProfilePageLibrarySection from './ProfilePageLibrarySection';
import { useOnboarding, TOUR_KEYS } from '../hooks/useOnboarding';
import { useTour } from '../onboarding/useTour';
import { PROFILE_TOUR_STEPS } from '../onboarding/tourSteps';
import { useProfileLibraryFilters } from '../hooks/useProfileLibraryFilters';
import { useThemeColors } from '../hooks/useThemeColors';

const PROFILE_OPTIONAL_STEPS = new Set([0, 1, 2, 3, 4]);

/* ─── Google Fonts injection ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

const defaultAvatar = '';

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
  .stat-card-3  { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
  .lib-section  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s both; }
`;
document.head.appendChild(styleEl);

// ... (le reste du code reste identique jusqu'aux types et fonctions utilitaires)

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
  abandoned_games_count?: number;
  friends_count?: number;
  xbox_profile?: {
    gamertag?: string;
    xuid?: string;
    gamerscore?: number;
    last_sync_at?: string;
  } | null;
};

type UserGame = {
  id: number;
  collection_ids?: number[];
  status: string;
  is_favorite?: boolean;
  date_added?: string;
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

type ProfileSectionHeaderProps = {
  label: string;
  C: ReturnType<typeof useThemeColors>;
};

const ProfileSectionHeader = ({ label, C }: ProfileSectionHeaderProps) => {
  return (
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
        {label}
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: '1px',
          background: `linear-gradient(to right, ${C.border}, transparent)`,
        }}
      />
    </Box>
  );
};

type ProfileStatCardProps = {
  label: string;
  value: string | null | undefined;
  cls: string;
  loading?: boolean;
  onClick?: () => void;
  clickable?: boolean;
  smallValue?: boolean;
  C: ReturnType<typeof useThemeColors>;
  glassCard: any;
};

const ProfileStatCard = ({
  label,
  value,
  cls,
  loading,
  onClick,
  clickable,
  smallValue,
  C,
  glassCard,
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
              backgroundColor: C.cardBg,
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

// ... (continuez avec les types et le hook useProfilePageModel - même code)

type ProfilePageModel = {
  user: UserProfile | null;
  loading: boolean;
  editOpen: boolean;
  form: UserProfile;
  avatarError: string;
  avatarBusy: boolean;
  userGames: UserGame[];
  avatarSrc: string;
  removeGame: (userGameId: number) => void;
  snackbar: {
    open: boolean;
    message: string;
    isError: boolean;
    showUndo?: boolean;
  };
  setSnackbar: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      message: string;
      isError: boolean;
      showUndo?: boolean;
    }>
  >;
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
  xboxBusy: boolean;
  handleXboxConnect: () => Promise<void>;
  handleXboxDisconnect: () => Promise<void>;
  handleXboxSync: () => Promise<void>;
  reloadUserGames: () => Promise<void>;
  gamesLoading: boolean;
};

function useProfilePageModel(): ProfilePageModel {
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
  const [xboxBusy, setXboxBusy] = useState(false);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  // ... (tout le code du hook reste identique)
  // Je ne recopie pas tout pour gagner de la place, mais gardez tout le code existant du hook

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
        globalThis.open(res.auth_url, '_blank', 'noopener,noreferrer');
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
      setUserGames(await fetchUserGames());
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

  const handleXboxConnect = async () => {
    if (xboxBusy) return;
    setXboxBusy(true);
    try {
      await startMicrosoftConnect();
    } catch (err: any) {
      alert(
        'Erreur: ' + (err?.message || 'Impossible de se connecter à Microsoft')
      );
      setXboxBusy(false);
    }
  };

  const handleXboxDisconnect = async () => {
    if (xboxBusy) return;
    setXboxBusy(true);
    try {
      await apiDelete('/api/auth/microsoft/disconnect/');
      setUser(prev => (prev ? { ...prev, xbox_profile: null } : null));
    } catch (err: any) {
      alert(
        'Erreur: ' +
          (err?.message || 'Impossible de déconnecter le compte Xbox')
      );
    } finally {
      setXboxBusy(false);
    }
  };

  const handleXboxSync = async () => {
    if (xboxBusy) return;
    setXboxBusy(true);
    try {
      await apiPost('/api/sync/xbox/', {});
      let polls = 0;
      const pollInterval = setInterval(async () => {
        polls++;
        try {
          await reloadUserGames();
          const meRes = await apiGet('/api/me/');
          setUser(meRes);
        } catch {
          /* ignore */
        }
        if (polls >= 10) {
          clearInterval(pollInterval);
          setXboxBusy(false);
        }
      }, 3000);
    } catch {
      setXboxBusy(false);
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
          const [games, meRes] = await Promise.all([
            fetchUserGames(),
            apiGet('/api/me/'),
          ]);
          setUserGames(games);
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
    fetchUserGames()
      .then(games => setUserGames(games as UserGame[]))
      .catch(() => {})
      .finally(() => setGamesLoading(false));
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
    showUndo?: boolean;
  }>({
    open: false,
    message: '',
    isError: false,
    showUndo: false,
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
    setSnackbar({ open: false, message: '', isError: false, showUndo: false });
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
      showUndo: true,
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
          showUndo: false,
        });
      }
    }, 5000);
  };

  return {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
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
    xboxBusy,
    handleXboxConnect,
    handleXboxDisconnect,
    handleXboxSync,
    reloadUserGames,
    gamesLoading,
    setSnackbar,
  };
}

// Continuez dans le prochain message pour les composants dialog...

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
  C: ReturnType<typeof useThemeColors>;
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
  C,
}: ProfileEditDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fieldSx = {
    fontFamily: FONT_BODY,
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      backgroundColor: C.glass,
      fontFamily: FONT_BODY,
      fontSize: 14.5,
      '& fieldset': { borderColor: C.softBorder },
      '&:hover fieldset': { borderColor: C.border },
      '&.Mui-focused fieldset': { borderColor: `${C.accent}88` },
    },
    '& .MuiInputLabel-root': { fontFamily: FONT_BODY },
    '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
  };

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
          backgroundColor: C.accentGlow,
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
                  onClick={() => {
                    onAvatarRemove();
                  }}
                  aria-label={t('profilePage.avatarRemoveAriaLabel')}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: C.accentDark,
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
                      bgcolor: avatarBusy ? C.accentDark : C.accent,
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
                  onChange={e => {
                    onAvatarChange(e);
                  }}
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

      <DialogActions
        sx={{ px: 3.5, pb: 3, pt: 1, justifyContent: 'space-between' }}
      >
        <Button
          onClick={() => {
            onClose();
            navigate('/settings');
          }}
          size="small"
          startIcon={<LockOutlinedIcon sx={{ fontSize: 16 }} />}
          endIcon={<ChevronRightIcon sx={{ fontSize: 18 }} />}
          sx={{
            color: C.accent,
            fontSize: 13,
            fontWeight: 500,
            textTransform: 'none',
            fontFamily: FONT_BODY,
            '&:hover': { backgroundColor: `${C.accent}10` },
          }}
        >
          {t('settings.changePassword')}
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
            onClick={() => {
              onSave();
            }}
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
                boxShadow: `0 6px 24px ${C.accentGlow}`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.18s ease',
            }}
          >
            {t('profilePage.save')}
          </Button>
        </Box>
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
  xbox_profile?: { gamertag?: string; xuid?: string } | null;
  xboxBusy: boolean;
  onXboxConnect: () => void;
  onXboxDisconnect: () => void;
  onXboxSync: () => void;
  C: ReturnType<typeof useThemeColors>;
  glassCard: any;
}>;

type IntegrationCardProps = Readonly<{
  label: string;
  desc: string;
  iconChar: string;
  iconBg: string;
  isConnected: boolean;
  statusLabel: string;
  isBusy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  syncTooltip: string;
  syncTooltipDefault: string;
  syncLabel: string;
  disconnectLabel: string;
  connectLabel: string;
  connectStyles?: any;
  syncStyles?: any;
  C: ReturnType<typeof useThemeColors>;
  glassCard: any;
  mt?: number;
}>;

function IntegrationCard({
  label,
  desc,
  iconChar,
  iconBg,
  isConnected,
  statusLabel,
  isBusy,
  onConnect,
  onDisconnect,
  onSync,
  syncTooltip,
  syncTooltipDefault,
  syncLabel,
  disconnectLabel,
  connectLabel,
  connectStyles,
  syncStyles,
  C,
  glassCard,
  mt = 0,
}: IntegrationCardProps) {
  return (
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
        mt,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: iconBg,
            color: '#fff',
            width: 48,
            height: 48,
            fontWeight: 700,
            fontFamily: FONT_DISPLAY,
          }}
        >
          {iconChar}
        </Avatar>
        <Box>
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontWeight: 700,
              fontSize: 16,
              color: C.title,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              color: C.muted,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {desc}
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
        {isConnected ? (
          <>
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                color: iconBg === '#171a21' ? '#43a047' : iconBg,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {statusLabel}
            </Typography>
            <Tooltip title={isBusy ? syncTooltip : syncTooltipDefault} arrow>
              <span>
                <Button
                  onClick={onSync}
                  disabled={isBusy}
                  variant="outlined"
                  sx={{
                    borderRadius: 999,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontFamily: FONT_BODY,
                    minWidth: 130,
                    ...syncStyles,
                  }}
                >
                  {isBusy ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    syncLabel
                  )}
                </Button>
              </span>
            </Tooltip>
            <Button
              onClick={onDisconnect}
              disabled={isBusy}
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
              {isBusy ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                disconnectLabel
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={onConnect}
            disabled={isBusy}
            variant="contained"
            sx={{
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 600,
              fontFamily: FONT_BODY,
              minWidth: 130,
              bgcolor: iconBg,
              color: '#fff',
              '&:hover': { bgcolor: iconBg },
              ...connectStyles,
            }}
          >
            {isBusy ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              connectLabel
            )}
          </Button>
        )}
      </Box>
    </Paper>
  );
}

function ProfileIntegrations({
  steam_id,
  steamBusy,
  onSteamConnect,
  onSteamDisconnect,
  onSteamSync,
  xbox_profile,
  xboxBusy,
  onXboxConnect,
  onXboxDisconnect,
  onXboxSync,
  C,
  glassCard,
}: ProfileIntegrationsProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 2.5 }}>
      <ProfileSectionHeader label={t('profilePage.integrationsLabel')} C={C} />

      <IntegrationCard
        label={t('profilePage.steamLabel')}
        desc={t('profilePage.steamDesc')}
        iconChar="S"
        iconBg="#171a21"
        isConnected={!!steam_id}
        statusLabel={t('profilePage.steamConnected')}
        isBusy={steamBusy}
        onConnect={onSteamConnect}
        onDisconnect={onSteamDisconnect}
        onSync={onSteamSync}
        syncTooltip={t('profilePage.steamSyncTooltip')}
        syncTooltipDefault={t('profilePage.steamSyncTooltipDefault')}
        syncLabel={t('profilePage.steamSync')}
        disconnectLabel={t('profilePage.steamDisconnect')}
        connectLabel={t('profilePage.steamConnect')}
        connectStyles={{ '&:hover': { bgcolor: '#2a475e' } }}
        syncStyles={{ borderColor: '#0288d1', color: '#0288d1' }}
        C={C}
        glassCard={glassCard}
      />

      <IntegrationCard
        label={t('profilePage.xboxLabel')}
        desc={t('profilePage.xboxDesc')}
        iconChar="X"
        iconBg="#107C10"
        isConnected={!!xbox_profile}
        statusLabel={xbox_profile?.gamertag || t('profilePage.xboxConnected')}
        isBusy={xboxBusy}
        onConnect={onXboxConnect}
        onDisconnect={onXboxDisconnect}
        onSync={onXboxSync}
        syncTooltip={t('profilePage.xboxSyncTooltip')}
        syncTooltipDefault={t('profilePage.xboxSyncTooltipDefault')}
        syncLabel={t('profilePage.xboxSync')}
        disconnectLabel={t('profilePage.xboxDisconnect')}
        connectLabel={t('profilePage.xboxConnect')}
        connectStyles={{ '&:hover': { bgcolor: '#0d620d' } }}
        syncStyles={{
          borderColor: '#107C10',
          color: '#107C10',
          '&:hover': {
            borderColor: '#0d620d',
            bgcolor: 'rgba(16, 124, 16, 0.04)',
          },
        }}
        C={C}
        glassCard={glassCard}
        mt={2}
      />
    </Box>
  );
}

function useProfilePageCollections(
  userPseudo: string | undefined,
  userGamesLength: number
) {
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

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
  }, [refreshCollections, userPseudo]);

  useEffect(() => {
    refreshCollections();
  }, [userGamesLength, refreshCollections]);

  return { collections, collectionsLoading, refreshCollections };
}

function getProfilePageBackground(isDark: boolean, pageBg: string): string {
  if (isDark) {
    return `
      url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E),
      radial-gradient(ellipse 120% 80% at 15% -10%, rgba(74,48,48,0.6) 0%, transparent 55%),
      radial-gradient(ellipse 80% 60% at 90% 110%, rgba(255,61,61,0.12) 0%, transparent 50%),
      ${pageBg}
    `;
  }

  return `
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E),
    radial-gradient(ellipse 120% 80% at 15% -10%, rgba(255,200,200,0.6) 0%, transparent 55%),
    radial-gradient(ellipse 80% 60% at 90% 110%, rgba(211,47,47,0.07) 0%, transparent 50%),
    ${pageBg}
  `;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const C = useThemeColors();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const {
    user,
    loading,
    editOpen,
    form,
    avatarError,
    avatarBusy,
    userGames,
    avatarSrc,
    removeGame,
    snackbar,
    setSnackbar,
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
    xboxBusy,
    handleXboxConnect,
    handleXboxDisconnect,
    handleXboxSync,
    reloadUserGames,
    gamesLoading,
  } = useProfilePageModel();

  const { collections, collectionsLoading, refreshCollections } =
    useProfilePageCollections(user?.pseudo, userGames.length);

  const {
    collectionFilterId,
    libraryFilter,
    setLibraryFilter,
    setLibraryCollectionFilter,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesAbandonnes,
    gamesFavoris,
    libraryCounts,
    gamesForLibraryFilter,
    singleFilterTitle,
    libraryBadgeText,
    gameListCollectionProps,
  } = useProfileLibraryFilters({
    searchParams,
    setSearchParams,
    userGames: userGames as ApiUserGame[],
    collections,
    collectionsLoading,
    reloadUserGames,
    refreshCollections,
    t,
  });

  const { isAuthenticated } = useAuth();
  const { shouldShow: shouldShowTour, markAsDone: markTourDone } =
    useOnboarding(TOUR_KEYS.profile);
  const { startTour } = useTour({
    steps: PROFILE_TOUR_STEPS,
    optionalSteps: PROFILE_OPTIONAL_STEPS,
    onDone: markTourDone,
  });

  useEffect(() => {
    if (!isAuthenticated || !shouldShowTour) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, shouldShowTour, startTour]);

  const [librarySectionMenuAnchor, setLibrarySectionMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [createCollectionModalOpen, setCreateCollectionModalOpen] =
    useState(false);
  const [manageCollectionsModalOpen, setManageCollectionsModalOpen] =
    useState(false);
  const [libraryPrivacyModalOpen, setLibraryPrivacyModalOpen] = useState(false);
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

  const glassCard = useMemo(
    () => ({
      background: C.cardBg,
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: `1px solid ${C.glassBorder}`,
      borderRadius: '20px',
      boxShadow:
        '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
      transition: 'transform 0.22s ease, box-shadow 0.22s ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow:
          '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      },
    }),
    [C]
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FONT_BODY,
        background: getProfilePageBackground(isDark, C.pageBg),
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
                backgroundColor: C.cardBg,
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
                <SecondaryButton
                  data-tour="profile-edit"
                  onClick={handleEditOpen}
                >
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
          <ProfileSectionHeader label={t('profilePage.infoLabel')} C={C} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {[
              {
                label: t('profilePage.friendsLabelStat'),
                value: user?.friends_count?.toString() ?? '0',
                cls: 'stat-card-1',
                onClick: () => navigate('/friends'),
                clickable: true,
              },
              {
                label: t('profilePage.reviewsLabel'),
                value: user?.review_count?.toString() || '0',
                cls: 'stat-card-0',
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
                C={C}
                glassCard={glassCard}
              />
            ))}
          </Box>
        </Box>

        {/* ── STATS SECTION ── */}
        <Box data-tour="profile-stats" sx={{ mb: 2.5 }}>
          <ProfileSectionHeader label={t('profilePage.statsLabel')} C={C} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(5, 1fr)',
              },
              gap: 2,
            }}
          >
            {[
              {
                label: t('profilePage.totalGamesLabel'),
                value: user?.total_games_count?.toString() || '0',
                cls: 'stat-card-0',
              },
              {
                label: t('profilePage.playtimeLabel'),
                value: formatPlaytime(user?.total_playtime),
                cls: 'stat-card-1',
              },
              {
                label: t('profilePage.playedRatioLabel'),
                value: user?.games_played_percentage
                  ? `${user.games_played_percentage}%`
                  : '0%',
                cls: 'stat-card-2',
              },
              {
                label: t('profilePage.finishedRatioLabel'),
                value: user?.games_finished_percentage
                  ? `${user.games_finished_percentage}%`
                  : '0%',
                cls: 'stat-card-3',
              },
              {
                label: t('profilePage.abandoned'),
                value: user?.abandoned_games_count?.toString() || '0',
                cls: 'stat-card-3',
              },
              ...(user?.xbox_profile
                ? [
                    {
                      label: t('profilePage.xboxGamerscoreLabel'),
                      value: user.xbox_profile.gamerscore?.toString() || '0',
                      cls: 'stat-card-3',
                    },
                  ]
                : []),
            ].map(props => (
              <ProfileStatCard
                key={props.label}
                {...props}
                loading={loading}
                C={C}
                glassCard={glassCard}
              />
            ))}
          </Box>
        </Box>

        <ProfileIntegrations
          steam_id={user?.steam_id}
          steamBusy={steamBusy}
          onSteamConnect={handleSteamConnect}
          onSteamDisconnect={handleSteamDisconnect}
          onSteamSync={handleSteamSync}
          xbox_profile={user?.xbox_profile}
          xboxBusy={xboxBusy}
          onXboxConnect={handleXboxConnect}
          onXboxDisconnect={handleXboxDisconnect}
          onXboxSync={handleXboxSync}
          C={C}
          glassCard={glassCard}
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
          onOpenLibraryPrivacy={() => setLibraryPrivacyModalOpen(true)}
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
          gamesAbandonnes={gamesAbandonnes}
          gamesForLibraryFilter={gamesForLibraryFilter}
          singleFilterTitle={singleFilterTitle}
          removeGame={removeGame}
          gameListCollectionProps={gameListCollectionProps}
          gamesLoading={gamesLoading}
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
      <LibraryPrivacyModal
        open={libraryPrivacyModalOpen}
        onClose={() => setLibraryPrivacyModalOpen(false)}
        onSaved={async () => {
          await refreshCollections();
          setSnackbar({
            open: true,
            message: t('libraryPrivacy.saved'),
            isError: false,
            showUndo: false,
          });
        }}
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
            snackbar.showUndo && !snackbar.isError ? (
              <Button color="inherit" size="small" onClick={handleUndo}>
                {t('profilePage.undoLabel')}
              </Button>
            ) : undefined
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
        C={C}
      />
    </Box>
  );
}
