import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
};

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function wsBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/notifications/';
    url.search = '';
    const token = getCookie('access_token');
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  } catch {
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

  const connectSocket = useCallback(() => {
    if (!isAuthenticated || socketRef.current) return;
    setConnectionState('connecting');
    const socket = new WebSocket(wsBaseUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setConnectionState('connected');
    };

    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          notification?: NotificationItem;
        };
        if (payload.type === 'notification' && payload.notification) {
          setNotifications(prev => {
            const exists = prev.find(
              item => item.id === payload.notification?.id
            );
            if (payload.notification?.unread && !exists) {
              setUnreadCount(prevCount => prevCount + 1);
            }
            return mergeIncomingNotification(
              prev,
              payload.notification as NotificationItem
            );
          });
        }
      } catch {
        // Ignore malformed socket payloads.
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
    }),
    [
      connectionState,
      loading,
      loadingMore,
      markAllAsRead,
      markAsRead,
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
