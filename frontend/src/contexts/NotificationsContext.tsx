import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchAllNotifications,
  fetchNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { useAuth } from './useAuth';
import type { NotificationItem } from '../types/notification';

type NotificationConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

type NotificationsContextType = {
  unreadCount: number;
  notifications: NotificationItem[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  connectionState: NotificationConnectionState;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleNotificationNavigation: (
    notification: NotificationItem
  ) => Promise<void>;
};

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

function wsBaseUrl() {
  // Avec le proxy Vite, on peut utiliser l'origine du frontend.
  // Le navigateur enverra automatiquement les cookies (même HttpOnly) car c'est le même domaine.
  const apiBase = window.location.origin;
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws-notifications/';
    console.log('[WS] Connecting to proxy URL:', url.toString());
    return url.toString();
  } catch (err) {
    console.error('[WS] Error building WS URL:', err);
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws/notifications/`;
  }
}

function mergeIncomingNotification(
  current: NotificationItem[],
  incoming: NotificationItem
) {
  const exists = current.some(item => item.id === incoming.id);
  if (exists) {
    return current.map(item => (item.id === incoming.id ? incoming : item));
  }
  return [incoming, ...current];
}

export function NotificationsProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextPagePath, setNextPagePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connectionState, setConnectionState] =
    useState<NotificationConnectionState>('disconnected');
  const [wsErrorToastOpen, setWsErrorToastOpen] = useState(false);
  const [lastNotification, setLastNotification] =
    useState<NotificationItem | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const navigate = useNavigate();

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const closeSocket = useCallback(() => {
    clearReconnectTimer();
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [firstPage, allNotifications] = await Promise.all([
        fetchNotificationsPage(),
        fetchAllNotifications(),
      ]);
      setNotifications(firstPage.results);
      setNextPagePath(firstPage.next);
      setUnreadCount(allNotifications.filter(item => item.unread).length);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadMoreNotifications = useCallback(async () => {
    if (!isAuthenticated || !nextPagePath || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchNotificationsPage(nextPagePath);
      setNotifications(prev => {
        const knownIds = new Set(prev.map(item => item.id));
        const nextItems = page.results.filter(item => !knownIds.has(item.id));
        return [...prev, ...nextItems];
      });
      setNextPagePath(page.next);
    } finally {
      setLoadingMore(false);
    }
  }, [isAuthenticated, loadingMore, nextPagePath]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      const target = notifications.find(item => item.id === notificationId);
      if (!target || !target.unread) return;
      await markNotificationRead(notificationId, false);
      setNotifications(prev =>
        prev.map(item =>
          item.id === notificationId ? { ...item, unread: false } : item
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    },
    [notifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (!isAuthenticated) return;
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(item => ({ ...item, unread: false })));
    setUnreadCount(0);
  }, [isAuthenticated]);

  const handleNotificationNavigation = useCallback(
    async (notification: NotificationItem) => {
      if (notification.unread) {
        await markAsRead(notification.id).catch(() => {});
      }

      const { verb, target, actor } = notification;

      switch (verb) {
        case 'friend_request_received':
          navigate('/friends?tab=requests');
          break;
        case 'friend_request_accepted':
          if (actor?.repr) {
            navigate(`/u/${actor.repr}`);
          } else {
            navigate('/friends');
          }
          break;
        case 'message':
          if (target?.id) {
            navigate(`/chat/${target.id}`);
          }
          break;
        case 'review':
          if (target?.id) {
            navigate(`/game/${target.id}`);
          }
          break;
        case 'match':
          navigate('/friends');
          break;
        case 'ticket_reviewing':
        case 'ticket_approved':
        case 'ticket_rejected':
        case 'ticket_published':
        case 'ticket_created':
          navigate('/admin/dashboard');
          break;
        default:
          if (target?.type === 'game' && target.id) {
            navigate(`/game/${target.id}`);
          } else if (target?.type === 'user' && target.repr) {
            navigate(`/u/${target.repr}`);
          } else {
            navigate('/profile');
          }
          break;
      }
    },
    [markAsRead, navigate]
  );

  const connectSocket = useCallback(() => {
    if (!isAuthenticated || socketRef.current) return;
    setConnectionState('connecting');
    const socket = new WebSocket(wsBaseUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WS] Connection established');
      reconnectAttemptsRef.current = 0;
      setConnectionState('connected');
    };

    socket.onmessage = event => {
      console.log('[WS] Message received:', event.data);
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          notification?: NotificationItem;
        };

        if (payload.type === 'notification' && payload.notification) {
          const incoming = payload.notification;
          console.log('[WS] Valid notification payload:', incoming);

          // 1. Update the list of notifications
          setNotifications(prev => {
            const exists = prev.some(item => item.id === incoming.id);

            // 2. If it's a new unread notification, trigger toast and increment count
            if (!exists && incoming.unread) {
              console.log('[WS] Triggering toast for new notification');
              setUnreadCount(c => c + 1);
              setLastNotification(incoming);
              setToastOpen(true);
            }

            return mergeIncomingNotification(prev, incoming);
          });
        } else {
          console.log('[WS] Ignored payload type:', payload.type);
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    };

    socket.onerror = () => {
      setConnectionState('error');
      setWsErrorToastOpen(true);
    };

    socket.onclose = () => {
      socketRef.current = null;
      if (!isAuthenticated) {
        setConnectionState('disconnected');
        return;
      }
      setConnectionState('error');
      setWsErrorToastOpen(true);
      reconnectAttemptsRef.current += 1;
      const delayMs = Math.min(30000, 1000 * 2 ** reconnectAttemptsRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connectSocket();
      }, delayMs);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      closeSocket();
      setNotifications([]);
      setUnreadCount(0);
      setNextPagePath(null);
      return;
    }
    refreshNotifications().catch(() => {});
    connectSocket();
    return () => closeSocket();
  }, [
    closeSocket,
    connectSocket,
    isAuthenticated,
    isAuthLoading,
    refreshNotifications,
  ]);

  const value = useMemo(
    () => ({
      unreadCount,
      notifications,
      hasMore: Boolean(nextPagePath),
      loading,
      loadingMore,
      connectionState,
      refreshNotifications,
      loadMoreNotifications,
      markAsRead,
      markAllAsRead,
      handleNotificationNavigation,
    }),
    [
      connectionState,
      loading,
      loadingMore,
      markAllAsRead,
      markAsRead,
      handleNotificationNavigation,
      nextPagePath,
      notifications,
      refreshNotifications,
      loadMoreNotifications,
      unreadCount,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Snackbar
        open={wsErrorToastOpen}
        autoHideDuration={4500}
        onClose={() => setWsErrorToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setWsErrorToastOpen(false)}
          severity="warning"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Reconnexion aux notifications en cours...
        </Alert>
      </Snackbar>

      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          if (lastNotification) {
            handleNotificationNavigation(lastNotification).catch(() => {});
            setToastOpen(false);
          }
        }}
      >
        <Alert
          severity="info"
          variant="filled"
          sx={{
            width: '100%',
            bgcolor: 'primary.main',
            '& .MuiAlert-icon': { color: 'white' },
          }}
          onClose={e => {
            e.stopPropagation();
            setToastOpen(false);
          }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {lastNotification?.verb.replaceAll('_', ' ')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {lastNotification?.target?.repr ??
                lastNotification?.actor?.repr ??
                ''}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>
    </NotificationsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  return ctx;
}
