import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { Alert, Box, Button, Paper, Snackbar, Tab, Tabs } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const tabIndex =
    tabParam === TAB_BLOCKED ? 2 : tabParam === TAB_REQUESTS ? 1 : 0;

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
    if (tabIndex === 2) {
      void loadBlocked();
    }
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

      <Paper elevation={0} sx={paperSx}>
        {tabIndex === 0 ? (
          <FriendsListPanel
            friends={friendsList}
            loading={loading}
            borderColor={borderColor}
            titleColor={titleColor}
            mutedColor={mutedColor}
            accentColor={accentColor}
            isDark={isDark}
          />
        ) : tabIndex === 1 ? (
          <FriendRequestsPanel
            incoming={incomingRequests}
            outgoing={outgoingRequests}
            loading={loading}
            busyRequestId={busyRequestId}
            onAcceptIncoming={id => void handleAcceptIncoming(id)}
            onDeclineIncoming={id => void handleDeclineIncoming(id)}
            onCancelOutgoing={id => void handleCancelOutgoing(id)}
            borderColor={borderColor}
            titleColor={titleColor}
            mutedColor={mutedColor}
          />
        ) : (
          <BlockedUsersPanel
            users={blockedList}
            loading={blockedLoading}
            busyUserId={busyUnblockId}
            onUnblock={id => void handleUnblock(id)}
            borderColor={borderColor}
            titleColor={titleColor}
            mutedColor={mutedColor}
          />
        )}
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
          void refresh();
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
