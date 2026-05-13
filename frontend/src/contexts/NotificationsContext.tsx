import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import GroupIcon from '@mui/icons-material/Group';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import StarIcon from '@mui/icons-material/Star';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wsBaseUrl() {
  // Le proxy Vite redirige /ws-notifications vers le backend (port 8000).
  // Le navigateur envoie automatiquement les cookies HttpOnly car c'est le même domaine.
  const apiBase = globalThis.location.origin;
  try {
    const url = new URL(apiBase);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws-notifications/';
    return url.toString();
  } catch {
    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${globalThis.location.host}/ws-notifications/`;
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

/** Label lisible selon le verb */
function getNotificationLabel(notification: NotificationItem): string {
  switch (notification.verb) {
    case 'friend_request_received':
      return "Demande d'ami reçue";
    case 'friend_request_accepted':
      return "Demande d'ami acceptée";
    case 'message':
      return 'Nouveau message';
    case 'review':
      return 'Nouvelle critique';
    case 'match':
      return 'Match trouvé';
    case 'ticket_reviewing':
      return 'Ticket en cours de révision';
    case 'ticket_approved':
      return 'Ticket approuvé';
    case 'ticket_rejected':
      return 'Ticket refusé';
    case 'ticket_published':
      return 'Ticket publié';
    default:
      return notification.verb.replaceAll('_', ' ');
  }
}

/** Icône MUI selon le verb */
function NotifIcon({ verb }: { readonly verb: string }) {
  const sx = { fontSize: '1.15rem', color: '#FF3D3D' };
  switch (verb) {
    case 'friend_request_received':
    case 'friend_request_accepted':
      return <GroupIcon sx={sx} />;
    case 'message':
      return <ChatBubbleIcon sx={sx} />;
    case 'review':
      return <StarIcon sx={sx} />;
    case 'match':
      return <SportsEsportsIcon sx={sx} />;
    case 'ticket_reviewing':
    case 'ticket_approved':
    case 'ticket_rejected':
    case 'ticket_published':
      return <ConfirmationNumberIcon sx={sx} />;
    default:
      return <NotificationsIcon sx={sx} />;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

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
  const [lastNotification, setLastNotification] =
    useState<NotificationItem | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const navigate = useNavigate();

  // ── Socket lifecycle ─────────────────────────────────────────────────────

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current !== null) {
      globalThis.clearTimeout(reconnectTimeoutRef.current);
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

  // ── API calls ────────────────────────────────────────────────────────────

  /**
   * Source de vérité unique pour unreadCount : on relit toujours depuis l'API.
   * Ne jamais incrémenter manuellement, pour éviter les décalages.
   */
  const refreshUnreadCount = useCallback(async () => {
    try {
      const allNotifications = await fetchAllNotifications();
      const newCount = allNotifications.filter(item => item.unread).length;
      setUnreadCount(newCount);
    } catch (err) {
      console.error('[Notifs] Erreur refresh compteur:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [firstPage] = await Promise.all([
        fetchNotificationsPage(),
        refreshUnreadCount(),
      ]);
      setNotifications(firstPage.results);
      setNextPagePath(firstPage.next);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshUnreadCount]);

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
      if (!target?.unread) return;
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

  // ── Navigation ───────────────────────────────────────────────────────────

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
          navigate(actor?.repr ? `/u/${actor.repr}` : '/friends');
          break;
        case 'message':
          if (target?.id) navigate(`/chat/${target.id}`);
          break;
        case 'review':
          if (target?.id) navigate(`/game/${target.id}`);
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

  // ── WebSocket ────────────────────────────────────────────────────────────

  const connectSocket = useCallback(() => {
    if (!isAuthenticated || socketRef.current) return;
    const wsUrl = wsBaseUrl();
    console.log('[WS] Tentative de connexion →', wsUrl);
    setConnectionState('connecting');
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('[WS] ✅ Connexion établie');
      reconnectAttemptsRef.current = 0;
      setConnectionState('connected');
    };

    const handleWebSocketMessage = (event: MessageEvent) => {
      console.log('[WS] 📨 Message reçu:', event.data);
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          notification?: NotificationItem;
        };
        console.log('[WS] type payload:', payload.type);

        if (payload.type === 'notification' && payload.notification) {
          const incoming = payload.notification;
          console.log(
            `[WS] Notification — id:${incoming.id} verb:"${incoming.verb}" unread:${incoming.unread}`
          );

          setNotifications(prev => {
            const exists = prev.some(item => item.id === incoming.id);
            if (!exists && incoming.unread) {
              setLastNotification(incoming);
              setToastOpen(true);
              refreshUnreadCount();
            }
            return mergeIncomingNotification(prev, incoming);
          });
        }
      } catch (err) {
        console.error('[WS] ❌ Erreur de parsing:', err, '| brut:', event.data);
      }
    };

    socket.onmessage = handleWebSocketMessage;

    socket.onerror = err => {
      console.error('[WS] ❌ Erreur socket:', err);
      setConnectionState('error');
    };

    socket.onclose = event => {
      console.log(
        `[WS] 🔌 Fermé — code:${event.code} raison:"${event.reason}"`
      );
      socketRef.current = null;
      if (!isAuthenticated) {
        setConnectionState('disconnected');
        return;
      }
      setConnectionState('error');
      reconnectAttemptsRef.current += 1;
      const delayMs = Math.min(30000, 1000 * 2 ** reconnectAttemptsRef.current);
      console.log(
        `[WS] Reconnexion dans ${delayMs}ms (tentative n°${reconnectAttemptsRef.current})`
      );
      reconnectTimeoutRef.current = globalThis.setTimeout(
        connectSocket,
        delayMs
      );
    };
  }, [isAuthenticated]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      closeSocket();
      setNotifications([]);
      setUnreadCount(0);
      setNextPagePath(null);
      return;
    }
    console.log('[Notifs] Auth OK — chargement initial + connexion WS');
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

  // ── Context value ─────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <NotificationsContext.Provider value={value}>
      {children}

      {/* Toast notification temps réel */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={6000}
        onClose={(_, reason) => {
          if (reason !== 'clickaway') setToastOpen(false);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ top: { xs: 16, sm: 24 } }}
      >
        <Box
          onClick={() => {
            if (lastNotification) {
              handleNotificationNavigation(lastNotification).catch(() => {});
              setToastOpen(false);
            }
          }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.5,
            borderRadius: '14px',
            cursor: 'pointer',
            minWidth: 280,
            maxWidth: 360,
            background: 'rgba(14, 14, 20, 0.93)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 61, 61, 0.25)',
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,61,61,0.08)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow:
                '0 14px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,61,61,0.22)',
            },
          }}
        >
          {/* Barre d'accent rouge → orange */}
          <Box
            sx={{
              width: 3,
              alignSelf: 'stretch',
              borderRadius: 4,
              background: 'linear-gradient(180deg, #FF3D3D 0%, #FF8C42 100%)',
              flexShrink: 0,
            }}
          />

          {/* Icône MUI dans un badge rond */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'rgba(255, 61, 61, 0.12)',
              flexShrink: 0,
            }}
          >
            {lastNotification && <NotifIcon verb={lastNotification.verb} />}
          </Box>

          {/* Contenu textuel */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: '0.84rem',
                color: '#fff',
                lineHeight: 1.35,
                mb: 0.3,
              }}
            >
              {lastNotification ? getNotificationLabel(lastNotification) : ''}
            </Typography>

            {(lastNotification?.target?.repr ??
              lastNotification?.actor?.repr) && (
              <Typography
                sx={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.74rem',
                  color: 'rgba(255,255,255,0.5)',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {lastNotification?.target?.repr ??
                  lastNotification?.actor?.repr}
              </Typography>
            )}
          </Box>

          {/* Fermeture */}
          <Box
            component="span"
            onClick={e => {
              e.stopPropagation();
              setToastOpen(false);
            }}
            sx={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '0.9rem',
              lineHeight: 1,
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'color 0.15s',
              '&:hover': { color: 'rgba(255,255,255,0.75)' },
            }}
          >
            ✕
          </Box>
        </Box>
      </Snackbar>
    </NotificationsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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
