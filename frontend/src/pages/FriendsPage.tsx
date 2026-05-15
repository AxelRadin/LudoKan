import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Alert, Box, Button, Paper, Snackbar, Tab, Tabs } from '@mui/material';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useOnboarding, TOUR_KEYS } from '../hooks/useOnboarding';
import { useTour } from '../onboarding/useTour';
import { FRIENDS_TOUR_STEPS } from '../onboarding/tourSteps';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import PageLayout from '../components/PageLayout';
import AddFriendSearchModal from '../components/social/AddFriendSearchModal';
import BlockedUsersPanel from '../components/social/BlockedUsersPanel';
import FriendRequestsPanel from '../components/social/FriendRequestsPanel';
import FriendsListPanel from '../components/social/FriendsListPanel';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  fetchBlockedUsers,
  unblockUser,
  type BlockedUserRow,
} from '../api/social';
import { useFriendsSocial } from '../hooks/useFriendsSocial';
import { useAuth } from '../contexts/useAuth';

const TAB_REQUESTS = 'requests';
const TAB_BLOCKED = 'blocked';

function friendsPageTabIndex(tabParam: string | null): number {
  if (tabParam === TAB_BLOCKED) return 2;
  if (tabParam === TAB_REQUESTS) return 1;
  return 0;
}

export default function FriendsPage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { user: authUser, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    isError: boolean;
  }>({ open: false, message: '', isError: false });

  const tabParam = searchParams.get('tab');
  const tabIndex = friendsPageTabIndex(tabParam);

  const setTabIndex = useCallback(
    (index: number) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (index === 0) p.delete('tab');
          else if (index === 1) p.set('tab', TAB_REQUESTS);
          else p.set('tab', TAB_BLOCKED);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const FRIENDS_OPTIONAL_STEPS = useMemo(() => new Set([0, 1, 2]), []);
  const { shouldShow, markAsDone } = useOnboarding(TOUR_KEYS.friends);
  const { startTour } = useTour({
    steps: FRIENDS_TOUR_STEPS,
    optionalSteps: FRIENDS_OPTIONAL_STEPS,
    onDone: markAsDone,
  });

  useEffect(() => {
    if (!isAuthenticated || !shouldShow) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [isAuthenticated, shouldShow, startTour]);

  const { friendsList, incomingRequests, outgoingRequests, loading, refresh } =
    useFriendsSocial(authUser?.id);

  const [blockedList, setBlockedList] = useState<BlockedUserRow[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [busyUnblockId, setBusyUnblockId] = useState<number | null>(null);

  const loadBlocked = useCallback(async () => {
    setBlockedLoading(true);
    try {
      setBlockedList(await fetchBlockedUsers());
    } catch {
      setBlockedList([]);
    } finally {
      setBlockedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabIndex !== 2) return;
    loadBlocked().catch(() => {});
  }, [tabIndex, loadBlocked]);

  const handleUnblock = useCallback(
    async (userId: number) => {
      setBusyUnblockId(userId);
      try {
        await unblockUser(userId);
        setSnackbar({
          open: true,
          message: t('friendsPage.unblocked'),
          isError: false,
        });
        await loadBlocked();
        await refresh();
      } catch {
        setSnackbar({
          open: true,
          message: t('friendsPage.unblockError'),
          isError: true,
        });
      } finally {
        setBusyUnblockId(null);
      }
    },
    [loadBlocked, refresh, t]
  );

  const borderColor = isDark ? '#4a3030' : '#f1c7c7';
  const titleColor = isDark ? '#f5e6e6' : '#0f0f0f';
  const mutedColor = isDark ? '#9e7070' : '#6e6e73';
  const accentColor = '#FF3D3D';

  const handleAcceptIncoming = useCallback(
    async (id: number) => {
      setBusyRequestId(id);
      try {
        await acceptFriendRequest(id);
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestAccepted'),
          isError: false,
        });
        await refresh();
      } catch {
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestActionError'),
          isError: true,
        });
      } finally {
        setBusyRequestId(null);
      }
    },
    [refresh, t]
  );

  const handleDeclineIncoming = useCallback(
    async (id: number) => {
      setBusyRequestId(id);
      try {
        await declineFriendRequest(id);
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestDeclined'),
          isError: false,
        });
        await refresh();
      } catch {
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestActionError'),
          isError: true,
        });
      } finally {
        setBusyRequestId(null);
      }
    },
    [refresh, t]
  );

  const handleCancelOutgoing = useCallback(
    async (id: number) => {
      setBusyRequestId(id);
      try {
        await cancelFriendRequest(id);
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestCancelled'),
          isError: false,
        });
        await refresh();
      } catch {
        setSnackbar({
          open: true,
          message: t('profilePage.friendRequestActionError'),
          isError: true,
        });
      } finally {
        setBusyRequestId(null);
      }
    },
    [refresh, t]
  );

  const paperSx = useMemo(
    () => ({
      p: { xs: 2, md: 2.5 },
      borderRadius: 2,
      bgcolor: isDark ? 'rgba(42,32,32,0.72)' : 'rgba(255,255,255,0.72)',
      border: `1px solid ${borderColor}`,
      backdropFilter: 'blur(12px)',
    }),
    [borderColor, isDark]
  );

  let tabPanelContent: ReactNode;
  if (tabIndex === 0) {
    tabPanelContent = (
      <FriendsListPanel
        friends={friendsList}
        loading={loading}
        borderColor={borderColor}
        titleColor={titleColor}
        mutedColor={mutedColor}
        accentColor={accentColor}
        isDark={isDark}
      />
    );
  } else if (tabIndex === 1) {
    tabPanelContent = (
      <FriendRequestsPanel
        incoming={incomingRequests}
        outgoing={outgoingRequests}
        loading={loading}
        busyRequestId={busyRequestId}
        onAcceptIncoming={id => {
          handleAcceptIncoming(id).catch(() => {});
        }}
        onDeclineIncoming={id => {
          handleDeclineIncoming(id).catch(() => {});
        }}
        onCancelOutgoing={id => {
          handleCancelOutgoing(id).catch(() => {});
        }}
        borderColor={borderColor}
        titleColor={titleColor}
        mutedColor={mutedColor}
      />
    );
  } else {
    tabPanelContent = (
      <BlockedUsersPanel
        users={blockedList}
        loading={blockedLoading}
        busyUserId={busyUnblockId}
        onUnblock={id => {
          handleUnblock(id).catch(() => {});
        }}
        borderColor={borderColor}
        titleColor={titleColor}
        mutedColor={mutedColor}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <PageLayout title={t('friendsPage.title')} backTo="/">
        <Box sx={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          {t('findFriendsPage.loginRequired')}
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('friendsPage.title')} backTo="/profile">
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
        }}
      >
        <Tabs
          data-tour="friends-tabs"
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            flex: { sm: '1 1 auto' },
            maxWidth: { sm: '100%' },
            '& .MuiTab-root': {
              fontFamily: "'DM Sans', system-ui, sans-serif",
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={t('friendsPage.tabFriends')} />
          <Tab label={t('friendsPage.tabRequests')} />
          <Tab label={t('friendsPage.tabBlocked')} />
        </Tabs>
        <Button
          data-tour="friends-add"
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setAddModalOpen(true)}
          sx={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            textTransform: 'none',
            alignSelf: { xs: 'stretch', sm: 'center' },
          }}
        >
          {t('friendsPage.addFriend')}
        </Button>
      </Box>

      <Paper data-tour="friends-list" elevation={0} sx={paperSx}>
        {tabPanelContent}
      </Paper>

      <AddFriendSearchModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onInviteSuccess={() => {
          setSnackbar({
            open: true,
            message: t('friendsPage.inviteSent'),
            isError: false,
          });
          refresh().catch(() => {});
        }}
        onInviteError={() => {
          setSnackbar({
            open: true,
            message: t('friendsPage.inviteError'),
            isError: true,
          });
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.isError ? 'error' : 'success'}
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
