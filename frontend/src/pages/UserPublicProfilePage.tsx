import MoreVertIcon from '@mui/icons-material/MoreVert';
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
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Link,
  type NavigateFunction,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useTheme, type Theme } from '@mui/material/styles';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import {
  LIBRARY_COLLECTION_QUERY_KEY,
  LIBRARY_STATUS_QUERY_KEY,
  type LibraryCollectionFilter,
  type LibraryStatusFilter,
  parseLibraryCollectionParam,
  parseLibraryStatusParam,
} from '../constants/libraryFilter';
import { formatPlaytime } from '../utils/timeUtils';
import ProfilePageLibrarySection from './ProfilePageLibrarySection';
import type { UserGame } from '../api/userGames';
import type { UserCollection } from '../api/collections';
import type {
  PublicCollectionRow,
  PublicUserProfile,
} from '../api/publicProfile';
import {
  fetchGamesInCommon,
  fetchPublicCollections,
  fetchPublicProfile,
  fetchPublicUserGames,
} from '../api/publicProfile';
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from '../api/social';
import { useAuth } from '../contexts/useAuth';
import zeldaBanner from '../assets/default/zelda-banner.png';
import {
  useProfileLibraryDerived,
  userGameToGameListItem,
} from '../hooks/useProfileLibraryDerived';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

function mapCollectionsForFilters(
  rows: PublicCollectionRow[]
): UserCollection[] {
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color || '',
    sort_order: r.sort_order ?? 0,
    is_default: false,
    is_visible_on_profile: true,
    is_visible_to_friends: false,
    system_key: '' as const,
    is_system: false,
    games_count: r.games_count,
    created_at: '',
    updated_at: '',
  }));
}

function isFriendRequestAutoAccepted(res: unknown): boolean {
  return (
    typeof res === 'object' &&
    res !== null &&
    'auto_accepted' in res &&
    Boolean((res as { auto_accepted?: boolean }).auto_accepted)
  );
}

function useGamesInCommonLoader(
  pseudo: string | undefined,
  isAuthenticated: boolean,
  relation: string | null | undefined,
  setGamesInCommon: Dispatch<SetStateAction<GameListItem[]>>
) {
  useEffect(() => {
    if (!pseudo || !isAuthenticated || relation !== 'friends') {
      setGamesInCommon([]);
      return;
    }
    let alive = true;
    fetchGamesInCommon(pseudo)
      .then(games => {
        if (!alive) return;
        setGamesInCommon(games.map(userGameToGameListItem));
      })
      .catch(() => {
        if (alive) setGamesInCommon([]);
      });
    return () => {
      alive = false;
    };
  }, [pseudo, isAuthenticated, relation, setGamesInCommon]);
}

function PublicProfileRelationActions({
  relation,
  profile,
  isAuthenticated,
  authUser,
  onFriendAction,
  muted,
}: Readonly<{
  relation: string | null | undefined;
  profile: PublicUserProfile;
  isAuthenticated: boolean;
  authUser: { id: number; pseudo?: string } | null | undefined;
  onFriendAction: (fn: () => Promise<unknown>, okMessage: string) => void;
  muted: string;
}>) {
  const { t } = useTranslation();
  const outgoingId = profile.outgoing_friend_request_id;
  const incomingId = profile.incoming_friend_request_id;

  if (!relation || relation === 'self') return null;

  return (
    <Box
      sx={{
        mt: 2,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        justifyContent: { xs: 'center', sm: 'flex-start' },
      }}
    >
      {relation === 'none' && isAuthenticated ? (
        <Button
          variant="contained"
          onClick={() =>
            onFriendAction(
              () => sendFriendRequest({ to_pseudo: profile.pseudo }),
              t('publicUserProfile.requestSent')
            )
          }
        >
          {t('publicUserProfile.addFriend')}
        </Button>
      ) : null}
      {relation === 'none' && !isAuthenticated ? (
        <Typography sx={{ fontFamily: FONT_BODY, fontSize: 14, color: muted }}>
          {t('publicUserProfile.loginToAdd')}
        </Typography>
      ) : null}
      {relation === 'pending_outgoing' && outgoingId != null ? (
        <>
          <Button disabled variant="outlined">
            {t('publicUserProfile.requestSent')}
          </Button>
          <Button
            variant="text"
            onClick={() =>
              onFriendAction(
                () => cancelFriendRequest(outgoingId),
                t('publicUserProfile.requestCancelled')
              )
            }
          >
            {t('publicUserProfile.cancelRequest')}
          </Button>
        </>
      ) : null}
      {relation === 'pending_incoming' && incomingId != null ? (
        <>
          <Button
            variant="contained"
            onClick={() =>
              onFriendAction(
                () => acceptFriendRequest(incomingId),
                t('publicUserProfile.nowFriends')
              )
            }
          >
            {t('publicUserProfile.accept')}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() =>
              onFriendAction(
                () => declineFriendRequest(incomingId),
                t('publicUserProfile.requestDeclined')
              )
            }
          >
            {t('publicUserProfile.decline')}
          </Button>
        </>
      ) : null}
      {relation === 'friends' && authUser ? (
        <Button
          variant="outlined"
          color="error"
          onClick={() =>
            onFriendAction(
              () => removeFriend(profile.id),
              t('publicUserProfile.removeFriend')
            )
          }
        >
          {t('publicUserProfile.removeFriend')}
        </Button>
      ) : null}
    </Box>
  );
}

function PublicProfileGamesInCommonSection({
  relation,
  gamesInCommon,
  gamesLoading,
  glassCard,
  muted,
}: Readonly<{
  relation: string | null | undefined;
  gamesInCommon: GameListItem[];
  gamesLoading: boolean;
  glassCard: Record<string, unknown>;
  muted: string;
}>) {
  const { t } = useTranslation();
  if (relation !== 'friends') return null;

  return (
    <>
      {gamesInCommon.length > 0 ? (
        <Paper elevation={0} sx={{ ...glassCard, p: 3, mt: 3 }}>
          <GameList
            games={gamesInCommon}
            title={`${t('publicUserProfile.gamesInCommon')} (${gamesInCommon.length})`}
            showStatus
          />
        </Paper>
      ) : null}
      {gamesInCommon.length === 0 && !gamesLoading ? (
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            color: muted,
            mt: 2,
            textAlign: 'center',
          }}
        >
          {t('publicUserProfile.gamesInCommonEmpty')}
        </Typography>
      ) : null}
    </>
  );
}

function usePublicProfilePageData(
  pseudo: string | undefined,
  isAuthenticated: boolean,
  authUser: { pseudo?: string } | null | undefined,
  navigate: NavigateFunction,
  t: TFunction
) {
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!pseudo) return;
    setLoading(true);
    setError(null);
    try {
      const p = await fetchPublicProfile(pseudo);
      setProfile(p);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : t('publicUserProfile.loadError')
      );
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [pseudo, t]);

  const loadLibrary = useCallback(async () => {
    if (!pseudo) return;
    setGamesLoading(true);
    setCollectionsLoading(true);
    try {
      const [cols, games] = await Promise.all([
        fetchPublicCollections(pseudo),
        fetchPublicUserGames(pseudo),
      ]);
      setCollections(mapCollectionsForFilters(cols));
      setUserGames(games);
    } catch {
      setCollections([]);
      setUserGames([]);
    } finally {
      setGamesLoading(false);
      setCollectionsLoading(false);
    }
  }, [pseudo]);

  useEffect(() => {
    if (!pseudo) return;
    if (isAuthenticated && authUser?.pseudo) {
      const decoded = decodeURIComponent(pseudo);
      if (decoded.toLowerCase() === authUser.pseudo.toLowerCase()) {
        navigate('/profile', { replace: true });
        return;
      }
    }
    load().catch(() => {});
  }, [load, pseudo, isAuthenticated, authUser?.pseudo, navigate]);

  useEffect(() => {
    if (!pseudo) return;
    if (isAuthenticated && authUser?.pseudo) {
      const decoded = decodeURIComponent(pseudo);
      if (decoded.toLowerCase() === authUser.pseudo.toLowerCase()) return;
    }
    loadLibrary().catch(() => {});
  }, [loadLibrary, pseudo, isAuthenticated, authUser?.pseudo]);

  return {
    profile,
    loading,
    error,
    userGames,
    gamesLoading,
    collections,
    collectionsLoading,
    load,
    loadLibrary,
  };
}

const PUBLIC_PROFILE_PAPER_SHADOW =
  '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)';

function usePublicProfilePageTheme(theme: Theme) {
  return useMemo(() => {
    const isDark = theme.palette.mode === 'dark';
    const pageBg = isDark ? '#1a1010' : '#ffd3d3';
    const shellBg = isDark ? '#2a2020' : '#fff7f7';
    const cardBg = isDark ? 'rgba(42,32,32,0.72)' : 'rgba(255,255,255,0.72)';
    const border = isDark ? '#4a3030' : '#f1c7c7';
    const titleColor = isDark ? '#f5e6e6' : '#0f0f0f';
    const textColor = isDark ? '#e0d0d0' : '#2b2b2b';
    const muted = isDark ? '#9e7070' : '#6e6e73';
    const accent = '#FF3D3D';
    const glassCard = {
      background: cardBg,
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: `1px solid ${isDark ? 'rgba(74,48,48,0.9)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: '20px',
      boxShadow: PUBLIC_PROFILE_PAPER_SHADOW,
    };
    return {
      pageBg,
      shellBg,
      cardBg,
      border,
      titleColor,
      textColor,
      muted,
      accent,
      glassCard,
      paperRestingBoxShadow: PUBLIC_PROFILE_PAPER_SHADOW,
    };
  }, [theme]);
}

export default function UserPublicProfilePage() {
  const { pseudo } = useParams<{ pseudo: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    profile,
    loading,
    error,
    userGames,
    gamesLoading,
    collections,
    collectionsLoading,
    load,
    loadLibrary,
  } = usePublicProfilePageData(pseudo, isAuthenticated, authUser, navigate, t);

  const [gamesInCommon, setGamesInCommon] = useState<GameListItem[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    error: boolean;
  }>({
    open: false,
    message: '',
    error: false,
  });
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  const collectionFilterId = useMemo(
    () =>
      parseLibraryCollectionParam(
        searchParams.get(LIBRARY_COLLECTION_QUERY_KEY)
      ),
    [searchParams]
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

  const relation = profile?.relation_to_me ?? null;

  useGamesInCommonLoader(pseudo, isAuthenticated, relation, setGamesInCommon);

  const {
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    libraryCounts,
    gamesForLibraryFilter,
    singleFilterTitle,
    libraryBadgeText,
  } = useProfileLibraryDerived(userGames, collectionFilterId, libraryFilter, t);

  const {
    pageBg,
    shellBg,
    border,
    titleColor,
    textColor,
    muted,
    accent,
    glassCard,
    paperRestingBoxShadow,
  } = usePublicProfilePageTheme(theme);

  const noopMenu = useCallback(() => {}, []);

  const handleFriendAction = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const res = await fn();
      if (isFriendRequestAutoAccepted(res)) {
        setSnackbar({
          open: true,
          message: t('publicUserProfile.nowFriends'),
          error: false,
        });
      } else {
        setSnackbar({ open: true, message: ok, error: false });
      }
      await load();
      await loadLibrary();
    } catch {
      setSnackbar({
        open: true,
        message: t('publicUserProfile.friendError'),
        error: true,
      });
    }
  };

  const handleConfirmBlock = useCallback(async () => {
    if (!profile) return;
    setBlockBusy(true);
    try {
      await blockUser({ user_id: profile.id });
      setBlockDialogOpen(false);
      setSnackbar({
        open: true,
        message: t('publicUserProfile.blockSuccess'),
        error: false,
      });
      navigate('/friends?tab=blocked');
    } catch {
      setSnackbar({
        open: true,
        message: t('publicUserProfile.blockError'),
        error: true,
      });
    } finally {
      setBlockBusy(false);
    }
  }, [profile, navigate, t]);

  if (!pseudo) {
    return null;
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: pageBg,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box sx={{ p: 3, background: pageBg, minHeight: '70vh' }}>
        <Alert severity="error">
          {error ?? t('publicUserProfile.loadError')}
        </Alert>
      </Box>
    );
  }

  const bannerSrc = profile.banner_url || zeldaBanner;
  const avatarSrc = profile.avatar_url || '';

  return (
    <Box sx={{ background: pageBg, minHeight: '100vh', pb: 6 }}>
      <Box
        sx={{
          position: 'relative',
          height: { xs: 200, md: 260 },
          backgroundImage: `url(${bannerSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
          }}
        />
      </Box>

      <Box
        sx={{
          maxWidth: 1040,
          mx: 'auto',
          px: { xs: 2, md: 3 },
          mt: { xs: -10, md: -12 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            ...glassCard,
            position: 'relative',
            p: { xs: 2.5, md: 3.5 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start' },
            gap: 2.5,
          }}
        >
          <Avatar
            src={avatarSrc || undefined}
            sx={{
              width: 108,
              height: 108,
              border: `4px solid ${shellBg}`,
              fontFamily: FONT_DISPLAY,
              fontSize: 40,
            }}
          >
            {profile.pseudo?.[0]?.toUpperCase() || '?'}
          </Avatar>
          <Box
            sx={{
              flex: 1,
              textAlign: { xs: 'center', sm: 'left' },
              width: '100%',
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1,
                width: '100%',
              }}
            >
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 800,
                  fontSize: { xs: 28, md: 34 },
                  color: titleColor,
                  flex: '1 1 auto',
                  minWidth: 0,
                }}
              >
                {profile.pseudo}
              </Typography>
              {isAuthenticated &&
              authUser?.pseudo &&
              profile.pseudo?.toLowerCase() !==
                authUser.pseudo.toLowerCase() ? (
                <IconButton
                  aria-label={t('publicUserProfile.moreOptionsAria')}
                  size="small"
                  onClick={e => setMoreMenuAnchor(e.currentTarget)}
                  sx={{ flexShrink: 0, color: muted }}
                >
                  <MoreVertIcon />
                </IconButton>
              ) : null}
            </Box>
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                color: muted,
                fontSize: 14,
                mt: 0.5,
              }}
            >
              {t('publicUserProfile.memberSince')}{' '}
              {profile.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : '—'}
            </Typography>
            {profile.description_courte ? (
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  color: textColor,
                  mt: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {profile.description_courte}
              </Typography>
            ) : null}

            {relation === 'self' ? (
              <Alert sx={{ mt: 2 }} severity="info">
                {t('publicUserProfile.selfHint')}
                <Button component={Link} to="/profile" sx={{ ml: 1 }}>
                  {t('publicUserProfile.goToMyProfile')}
                </Button>
              </Alert>
            ) : null}

            <PublicProfileRelationActions
              relation={relation}
              profile={profile}
              isAuthenticated={isAuthenticated}
              authUser={authUser}
              onFriendAction={(fn, okMessage) => {
                handleFriendAction(fn, okMessage).catch(() => {});
              }}
              muted={muted}
            />

            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Typography
                sx={{ fontFamily: FONT_BODY, fontSize: 13, color: muted }}
              >
                {t('publicUserProfile.statsGames')}:{' '}
                <strong style={{ color: titleColor }}>
                  {profile.total_games_count ?? 0}
                </strong>
              </Typography>
              <Typography
                sx={{ fontFamily: FONT_BODY, fontSize: 13, color: muted }}
              >
                {t('publicUserProfile.statsPlaytime')}:{' '}
                <strong style={{ color: titleColor }}>
                  {formatPlaytime(profile.total_playtime)}
                </strong>
              </Typography>
              <Typography
                sx={{ fontFamily: FONT_BODY, fontSize: 13, color: muted }}
              >
                {t('publicUserProfile.reviews')}:{' '}
                <strong style={{ color: titleColor }}>
                  {profile.review_count ?? 0}
                </strong>
              </Typography>
              <Typography
                sx={{ fontFamily: FONT_BODY, fontSize: 13, color: muted }}
              >
                {t('publicUserProfile.friendsLabel')} —{' '}
                {profile.friends_count ?? 0}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <PublicProfileGamesInCommonSection
          relation={relation}
          gamesInCommon={gamesInCommon}
          gamesLoading={gamesLoading}
          glassCard={glassCard}
          muted={muted}
        />

        <Box sx={{ mt: 3 }}>
          <ProfilePageLibrarySection
            glassCard={glassCard}
            paperRestingBoxShadow={paperRestingBoxShadow}
            accent={accent}
            titleColor={titleColor}
            borderColor={border}
            libraryBadgeText={libraryBadgeText}
            librarySectionMenuAnchor={null}
            setLibrarySectionMenuAnchor={noopMenu}
            setCreateCollectionModalOpen={noopMenu}
            setManageCollectionsModalOpen={noopMenu}
            onOpenLibraryPrivacy={noopMenu}
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
            removeGame={() => {}}
            gameListCollectionProps={{}}
            gamesLoading={gamesLoading}
            readOnly
          />
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="text"
            onClick={() => navigate(-1)}
            sx={{ fontFamily: FONT_BODY }}
          >
            ← {t('licensePage.back')}
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={() => setMoreMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setMoreMenuAnchor(null);
            setBlockDialogOpen(true);
          }}
          sx={{ fontFamily: FONT_BODY }}
        >
          {t('publicUserProfile.blockUser')}
        </MenuItem>
      </Menu>

      <Dialog
        open={blockDialogOpen}
        onClose={() => !blockBusy && setBlockDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          {t('publicUserProfile.blockConfirmTitle')}
        </DialogTitle>
        <DialogContent sx={{ fontFamily: FONT_BODY }}>
          {t('publicUserProfile.blockConfirmBody', { pseudo: profile.pseudo })}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setBlockDialogOpen(false)}
            disabled={blockBusy}
            sx={{ fontFamily: FONT_BODY }}
          >
            {t('profilePage.cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={blockBusy}
            onClick={() => {
              handleConfirmBlock().catch(() => {});
            }}
            sx={{ fontFamily: FONT_BODY }}
          >
            {blockBusy ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              t('publicUserProfile.blockConfirm')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.error ? 'error' : 'success'}
          variant="filled"
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
