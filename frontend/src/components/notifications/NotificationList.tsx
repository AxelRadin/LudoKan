import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItem,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationsContext';
import type { NotificationItem } from '../../types/notification';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeDate(value: string, lang: string): string {
  const date = new Date(value);
  const now = Date.now();
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (abs < 60) return rtf.format(deltaSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(deltaSeconds / 86400), 'day');
  return new Date(value).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });
}

function notificationTitle(t: (key: string) => string, verb: string): string {
  const key = `notifications.verb.${verb}`;
  const translated = t(key);
  return translated === key ? verb.replaceAll('_', ' ') : translated;
}

function notificationDescription(notification: NotificationItem): string {
  const extraMessage =
    notification.extra &&
    typeof notification.extra === 'object' &&
    'message' in notification.extra &&
    typeof notification.extra.message === 'string'
      ? notification.extra.message
      : null;
  return (
    extraMessage ?? notification.target?.repr ?? notification.actor?.repr ?? ''
  );
}

/** Date label pour le groupement */
function dateGroupLabel(timestamp: string, lang: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return lang.startsWith('fr') ? "Aujourd'hui" : 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return lang.startsWith('fr') ? 'Hier' : 'Yesterday';
  }
  const daysAgo = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysAgo < 7) {
    return lang.startsWith('fr') ? 'Cette semaine' : 'This week';
  }
  return lang.startsWith('fr') ? 'Plus ancien' : 'Older';
}

/** Icône MUI selon le verb */
function NotifTypeIcon({ verb }: { readonly verb: string }) {
  const sx = { fontSize: '1.1rem' };
  switch (verb) {
    case 'friend_request_received':
      return <GroupAddIcon sx={sx} />;
    case 'friend_request_accepted':
      return <HowToRegIcon sx={sx} />;
    case 'message':
      return <ChatBubbleOutlineIcon sx={sx} />;
    case 'review':
      return <RateReviewOutlinedIcon sx={sx} />;
    case 'match':
      return <SportsEsportsOutlinedIcon sx={sx} />;
    case 'ticket_reviewing':
    case 'ticket_approved':
    case 'ticket_rejected':
    case 'ticket_published':
    case 'ticket_created':
      return <ConfirmationNumberOutlinedIcon sx={sx} />;
    default:
      return <NotificationsNoneIcon sx={sx} />;
  }
}

/** Couleur d'accent selon le verb */
function verbColor(verb: string): string {
  switch (verb) {
    case 'friend_request_received':
    case 'friend_request_accepted':
      return '#4CAF50';
    case 'message':
      return '#2196F3';
    case 'review':
      return '#FF9800';
    case 'match':
      return '#9C27B0';
    case 'ticket_approved':
      return '#4CAF50';
    case 'ticket_rejected':
      return '#FF3D3D';
    default:
      return '#FF3D3D';
  }
}

/** Initiale pour l'avatar */
function getInitial(notification: NotificationItem): string {
  const repr = notification.actor?.repr ?? notification.target?.repr ?? '';
  return repr.charAt(0).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type NotificationListProps = {
  readonly maxHeight?: number | string;
  readonly onItemClick?: () => void;
  readonly filterUnread?: boolean;
  readonly overrideItems?: NotificationItem[];
};

function NotificationListItem({
  notification,
  onItemClick,
}: {
  readonly notification: NotificationItem;
  readonly onItemClick?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { markAsRead, handleNotificationNavigation } = useNotifications();

  const color = verbColor(notification.verb);
  const desc = notificationDescription(notification);

  const handleNavigate = () => {
    onItemClick?.();
    handleNotificationNavigation(notification).catch(err => {
      console.error('Navigation error:', err);
    });
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id).catch(err => {
      console.error('Mark as read error:', err);
    });
  };

  return (
    <ListItem
      disablePadding
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'relative',
        '&::before': notification.unread
          ? {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              borderRadius: '0 2px 2px 0',
              bgcolor: color,
            }
          : {},
        bgcolor: notification.unread ? `${color}08` : 'transparent',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: notification.unread ? `${color}14` : 'action.hover',
        },
      }}
    >
      <Box
        onClick={handleNavigate}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          px: 2,
          py: 1.5,
          pl: notification.unread ? 2.5 : 2,
          flex: 1,
          cursor: 'pointer',
          minWidth: 0,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              bgcolor: `${color}20`,
              color,
              fontSize: '0.85rem',
              fontWeight: 700,
              border: `1.5px solid ${color}30`,
            }}
          >
            {getInitial(notification)}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              bgcolor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid',
              borderColor: 'background.paper',
              '& svg': { fontSize: '0.6rem !important', color: '#fff' },
            }}
          >
            <NotifTypeIcon verb={notification.verb} />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: notification.unread ? 700 : 500,
                color: notification.unread ? 'text.primary' : 'text.secondary',
                lineHeight: 1.3,
              }}
            >
              {notificationTitle(t, notification.verb)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontSize: '0.68rem',
              }}
            >
              {relativeDate(notification.timestamp, i18n.language)}
            </Typography>
          </Box>

          {desc && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.disabled',
                fontSize: '0.75rem',
                mt: 0.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {desc}
            </Typography>
          )}
        </Box>
      </Box>

      {notification.unread && (
        <Tooltip title={t('notifications.markRead')} placement="left">
          <IconButton
            size="small"
            onClick={handleMarkAsRead}
            sx={{
              mr: 1,
              color: 'text.disabled',
              opacity: 0,
              transition: 'opacity 0.2s',
              'li:hover &': { opacity: 1 },
              '&:hover': { color },
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>
      )}
    </ListItem>
  );
}

export default function NotificationList({
  maxHeight,
  onItemClick,
  filterUnread = false,
  overrideItems,
}: NotificationListProps) {
  const { t, i18n } = useTranslation();
  const { notifications } = useNotifications();

  // Source de données : override externe ou context
  const sourceNotifications = overrideItems ?? notifications;

  // Tri chronologique décroissant + filtre optionnel
  const sortedNotifications = useMemo(() => {
    const base = filterUnread
      ? sourceNotifications.filter(n => n.unread)
      : sourceNotifications;
    return [...base].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [sourceNotifications, filterUnread]);

  // Groupement par date
  const grouped = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const notif of sortedNotifications) {
      const label = dateGroupLabel(notif.timestamp, i18n.language);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(notif);
    }
    return Array.from(map.entries());
  }, [sortedNotifications, i18n.language]);

  // État vide
  if (sortedNotifications.length === 0) {
    const isFilteredEmpty = filterUnread;
    const isFR = i18n.language.startsWith('fr');
    let emptyMessage = t('notifications.empty');
    if (isFilteredEmpty) {
      emptyMessage = isFR
        ? 'Aucune notification non-lue'
        : 'No unread notifications';
    }

    let caughtUpMessage = '';
    if (isFilteredEmpty) {
      caughtUpMessage = isFR ? 'Vous êtes à jour !' : "You're all caught up!";
    }

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 6,
          gap: 1.5,
        }}
      >
        <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {emptyMessage}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {caughtUpMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ py: 0, maxHeight, overflowY: 'auto' }}>
      {grouped.map(([groupLabel, items]) => (
        <Box key={groupLabel}>
          {/* En-tête de groupe */}
          <Box
            sx={{
              px: 2,
              py: 0.75,
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'text.disabled',
                fontSize: '0.68rem',
              }}
            >
              {groupLabel}
            </Typography>
          </Box>

          {/* Items du groupe */}
          {items.map(notification => (
            <NotificationListItem
              key={notification.id}
              notification={notification}
              onItemClick={onItemClick}
            />
          ))}
        </Box>
      ))}
    </List>
  );
}
