import CircleIcon from '@mui/icons-material/Circle';
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationsContext';
import type { NotificationItem } from '../../types/notification';

function relativeDate(value: string, lang: string): string {
  const date = new Date(value);
  const now = Date.now();
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (abs < 60) return rtf.format(deltaSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
  return rtf.format(Math.round(deltaSeconds / 86400), 'day');
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
    extraMessage ??
    notification.target?.repr ??
    notification.actor?.repr ??
    notification.verb
  );
}

export default function NotificationDropdown() {
  const { t, i18n } = useTranslation();
  const {
    notifications,
    loading,
    hasMore,
    loadingMore,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loadMoreNotifications,
  } = useNotifications();

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [notifications]
  );

  if (loading) {
    return (
      <Box
        sx={{
          minWidth: 320,
          minHeight: 160,
          p: 2,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress size={22} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: 360, maxWidth: '100vw' }}>
      <Box
        sx={{
          px: 2,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('notifications.title')}
        </Typography>
        <Button
          size="small"
          onClick={() => markAllAsRead().catch(() => {})}
          disabled={unreadCount === 0}
        >
          {t('notifications.markAllRead')}
        </Button>
      </Box>

      {sortedNotifications.length === 0 ? (
        <Box sx={{ px: 2, py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t('notifications.empty')}
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0, maxHeight: 380, overflowY: 'auto' }}>
          {sortedNotifications.map(notification => (
            <ListItem
              key={notification.id}
              alignItems="flex-start"
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: notification.unread
                  ? 'action.hover'
                  : 'transparent',
              }}
              secondaryAction={
                notification.unread ? (
                  <Button
                    size="small"
                    onClick={() => markAsRead(notification.id).catch(() => {})}
                  >
                    {t('notifications.markRead')}
                  </Button>
                ) : null
              }
            >
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      pr: 4,
                    }}
                  >
                    {notification.unread && (
                      <CircleIcon color="error" sx={{ fontSize: 10 }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: notification.unread ? 700 : 500,
                        textTransform: 'capitalize',
                      }}
                    >
                      {notificationTitle(t, notification.verb)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.4 }}
                    >
                      {notificationDescription(notification)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {relativeDate(notification.timestamp, i18n.language)}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {hasMore && (
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={() => loadMoreNotifications().catch(() => {})}
            disabled={loadingMore}
          >
            {loadingMore
              ? t('notifications.loadingMore')
              : t('notifications.loadMore')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
