import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import type { GameListItem } from '../components/GameList';
import GameList from '../components/GameList';
import {
  LIBRARY_COLLECTION_QUERY_KEY,
  LIBRARY_STATUS_QUERY_KEY,
  type LibraryCollectionFilter,
  type LibraryCounts,
  type LibraryStatusFilter,
  parseLibraryCollectionParam,
  parseLibraryStatusParam,
} from '../constants/libraryFilter';
import ProfilePageLibrarySection from './ProfilePageLibrarySection';
import type { UserGame } from '../api/userGames';
import type { UserCollection } from '../api/collections';
import type { PublicCollectionRow } from '../api/publicProfile';
import {
  fetchGamesInCommon,
  fetchPublicCollections,
  fetchPublicProfile,
  fetchPublicUserGames,
  type PublicUserProfile,
} from '../api/publicProfile';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from '../api/social';
import { useAuth } from '../contexts/useAuth';
import zeldaBanner from '../assets/default/zelda-banner.png';

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

function gamesForStatus(games: UserGame[], status: string): GameListItem[] {
  return games
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
    }));
}

export default function UserPublicProfilePage() {
  const { pseudo } = useParams<{ pseudo: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
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

  const relation = profile?.relation_to_me ?? null;

  useEffect(() => {
    if (!pseudo || !isAuthenticated || relation !== 'friends') {
      setGamesInCommon([]);
      return;
    }
    let alive = true;
    fetchGamesInCommon(pseudo)
      .then(games => {
        if (!alive) return;
        setGamesInCommon(
          games.map(g => ({
            id: g.game.id,
            name: g.game.name,
            cover_url: g.game.cover_url,
            image: g.game.image,
            status: g.status,
            userGameId: g.id,
            steam_appid: g.game.steam_appid,
            playtime_forever: g.playtime_forever,
          }))
        );
      })
      .catch(() => {
        if (alive) setGamesInCommon([]);
      });
    return () => {
      alive = false;
    };
  }, [pseudo, isAuthenticated, relation]);

  const userGamesForLibrary = useMemo(() => {
    if (collectionFilterId === 'ALL') return userGames;
    return userGames.filter(ug =>
      Array.isArray(ug.collection_ids)
        ? ug.collection_ids.includes(collectionFilterId)
        : false
    );
  }, [userGames, collectionFilterId]);

  const gamesEnCours = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'EN_COURS'),
    [userGamesForLibrary]
  );
  const gamesTermines = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'TERMINE'),
    [userGamesForLibrary]
  );
  const gamesEnvie = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'ENVIE_DE_JOUER'),
    [userGamesForLibrary]
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

  const libraryCounts: LibraryCounts = useMemo(
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

  const libraryBadgeText = useMemo(() => {
    if (collectionFilterId === 'ALL') {
      return userGames.length <= 1
        ? t('profilePage.libraryTotal', { count: userGames.length })
        : t('profilePage.libraryTotalPlural', { count: userGames.length });
    }
    return userGamesForLibrary.length <= 1
      ? t('profilePage.libraryInViewOne', { count: userGamesForLibrary.length })
      : t('profilePage.libraryInViewMany', {
          count: userGamesForLibrary.length,
        });
  }, [collectionFilterId, userGames.length, userGamesForLibrary.length, t]);

  const isDark = theme.palette.mode === 'dark';
  const pageBg = isDark ? '#1a1010' : '#ffd3d3';
  const shellBg = isDark ? '#2a2020' : '#fff7f7';
  const cardBg = isDark ? 'rgba(42,32,32,0.72)' : 'rgba(255,255,255,0.72)';
  const border = isDark ? '#4a3030' : '#f1c7c7';
  const titleColor = isDark ? '#f5e6e6' : '#0f0f0f';
  const textColor = isDark ? '#e0d0d0' : '#2b2b2b';
  const muted = isDark ? '#9e7070' : '#6e6e73';
  const accent = '#FF3D3D';

  const glassCard = useMemo(
    () => ({
      background: cardBg,
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: `1px solid ${isDark ? 'rgba(74,48,48,0.9)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: '20px',
      boxShadow:
        '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
    }),
    [cardBg, isDark]
  );

  const paperRestingBoxShadow =
    '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)';

  const noopMenu = useCallback(() => {}, []);

  const handleFriendAction = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      const res = await fn();
      if (
        res &&
        typeof res === 'object' &&
        'auto_accepted' in res &&
        (res as { auto_accepted?: boolean }).auto_accepted
      ) {
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
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 800,
                fontSize: { xs: 28, md: 34 },
                color: titleColor,
              }}
            >
              {profile.pseudo}
            </Typography>
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

            {relation && relation !== 'self' ? (
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
                      handleFriendAction(
                        () => sendFriendRequest({ to_pseudo: profile.pseudo }),
                        t('publicUserProfile.requestSent')
                      )
                    }
                  >
                    {t('publicUserProfile.addFriend')}
                  </Button>
                ) : null}
                {relation === 'none' && !isAuthenticated ? (
                  <Typography
                    sx={{ fontFamily: FONT_BODY, fontSize: 14, color: muted }}
                  >
                    {t('publicUserProfile.loginToAdd')}
                  </Typography>
                ) : null}
                {relation === 'pending_outgoing' &&
                profile.outgoing_friend_request_id != null ? (
                  <>
                    <Button disabled variant="outlined">
                      {t('publicUserProfile.requestSent')}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() =>
                        handleFriendAction(
                          () =>
                            cancelFriendRequest(
                              profile.outgoing_friend_request_id!
                            ),
                          t('publicUserProfile.requestCancelled')
                        )
                      }
                    >
                      {t('publicUserProfile.cancelRequest')}
                    </Button>
                  </>
                ) : null}
                {relation === 'pending_incoming' &&
                profile.incoming_friend_request_id != null ? (
                  <>
                    <Button
                      variant="contained"
                      onClick={() =>
                        handleFriendAction(
                          () =>
                            acceptFriendRequest(
                              profile.incoming_friend_request_id!
                            ),
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
                        handleFriendAction(
                          () =>
                            declineFriendRequest(
                              profile.incoming_friend_request_id!
                            ),
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
                      handleFriendAction(
                        () => removeFriend(profile.id),
                        t('publicUserProfile.removeFriend')
                      )
                    }
                  >
                    {t('publicUserProfile.removeFriend')}
                  </Button>
                ) : null}
              </Box>
            ) : null}

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
                  {(profile.total_playtime ?? 0).toFixed(1)} h
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

        {relation === 'friends' && gamesInCommon.length > 0 ? (
          <Paper elevation={0} sx={{ ...glassCard, p: 3, mt: 3 }}>
            <GameList
              games={gamesInCommon}
              title={`${t('publicUserProfile.gamesInCommon')} (${gamesInCommon.length})`}
              showStatus
            />
          </Paper>
        ) : null}

        {relation === 'friends' &&
        gamesInCommon.length === 0 &&
        !gamesLoading ? (
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
